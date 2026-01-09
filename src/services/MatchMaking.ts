import { RedisManager } from "../libs/redisManager";
import type { PlayerDetails } from "../types/userTypes";

export class MatchMaking {
    private redis: RedisManager;
    private readonly BATCH_SIZE = 50;
    private readonly ACTIVE_QUEUES_KEY = "queues:active_list";
    private readonly MATCH_SCRIPT = `
        -- Keys: [1] time_key, [2] rating_key, [3] details_key
        -- Args: [1] player1_id, [2] player2_id

        local p1 = ARGV[1]
        local p2 = ARGV[2]

        -- 1. Check if BOTH players still exist in the time queue
        local s1 = redis.call("ZSCORE", KEYS[1], p1)
        local s2 = redis.call("ZSCORE", KEYS[1], p2)

        if s1 and s2 then
            -- 2. Both exist
            redis.call("ZREM", KEYS[1], p1, p2)      -- Time Queue
            redis.call("ZREM", KEYS[2], p1, p2)      -- Rating Queue
            redis.call("HDEL", KEYS[3], p1, p2)      -- Details Hash
            return 1 -- Success
        else
            return 0 -- Failed 
        end
    `;

    constructor() {
        this.redis = RedisManager.getInstance();
    }

    private getQueueKeys(queueId: string){
        return {
            time: `queue:${queueId}:time`,
            rating: `queue:${queueId}:rating`,
            details: `queue:${queueId}:details`
        }
    }


    public async joinQueue(
        userId: string,
        rating: number,
        variant: string,
        timeControl: string,
    ): Promise<void>{
        const joinTime = Date.now();
        const details: PlayerDetails = {
            userId, 
            rating,
            variant,
            timeControl,
            joinTime,
        }

        const queueId = `${variant}:${timeControl}`;
        const keys = this.getQueueKeys(queueId);

        const multi = this.redis.client.multi();
        multi.hSet(keys.details, userId, JSON.stringify(details));
        multi.zAdd(keys.time, { score: joinTime, value: userId});
        multi.zAdd(keys.rating, { score: rating, value: userId });
        multi.sAdd(this.ACTIVE_QUEUES_KEY, queueId);

        await multi.exec();
    }

    public async processQueues(): Promise<void> {
        const activeQueues = await this.redis.client.sMembers(this.ACTIVE_QUEUES_KEY);
        await Promise.all(activeQueues.map(queueId => this.processBatch(queueId)));
    }

    private async processBatch(queueId: string): Promise<void> {
        const keys = this.getQueueKeys(queueId);

        // fetch the oldest users in line
        const oldestUserIds = await this.redis.client.zRange(keys.time, 0, this.BATCH_SIZE - 1);

        if(oldestUserIds.length === 0){
            await this.redis.client.sRem(this.ACTIVE_QUEUES_KEY, queueId);
            return;
        }
        
        const detailsStrings = await this.redis.client.hmGet(keys.details, oldestUserIds);
        const activePlayers: PlayerDetails[] = detailsStrings
            .filter(s => s != null)
            .map(s => JSON.parse(s));

        for (const player of activePlayers) {
            const stillInQueue = await this.redis.client.zScore(keys.time, player.userId);
            if (!stillInQueue) continue;

            await this.findMatchForPlayer(player, queueId);
        }
    } 

    private async findMatchForPlayer(player: PlayerDetails, queueId: string): Promise<void> {
        const keys = this.getQueueKeys(queueId);

        const waitTimeSeconds = (Date.now() - player.joinTime) / 1000;
        const range = 50 + (waitTimeSeconds * 50); 
        
        const minRating = player.rating - range;
        const maxRating = player.rating + range;

        const candidates = await this.redis.client.zRangeByScore(
            keys.rating, minRating, maxRating
        );

        const opponentId = candidates.find(id => id !== player.userId);

        if (opponentId) {
            await this.executeMatchAtomic(player.userId, opponentId, queueId);
        }
    }

    private async executeMatchAtomic(p1: string, p2: string, queueId: string): Promise<boolean> {
        const keys = this.getQueueKeys(queueId);

        try {
            // Execute the Lua Script
            // We use 'eval' (or 'evalSha' for optimization later)
            const result = await this.redis.client.eval(
                this.MATCH_SCRIPT,
                {
                    keys: [keys.time, keys.rating, keys.details],
                    arguments: [p1, p2]
                }
            );

            if (result === 1) {
                console.log(`MATCH [${queueId}]: ${p1} vs ${p2}`);
                // TODO: Create Game in DB
                return true;
            } else {
                // Return false silently; the worker loop will just pick up the next person
                return false;
            }

        } catch (e) {
            console.error("Lua Script Error:", e);
            return false;
        }
    }


}