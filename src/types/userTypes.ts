export interface UserData {
  username: string,
  email: string,
  password: string,
}

export interface PlayerDetails {
  userId: string;
  rating: number;
  joinTime: number;
  variant: string;
  timeControl: string;
}

export interface ApiResponse<T> { // standard API response structure 
  success: boolean,
  data?: T,
  error?: string
}
