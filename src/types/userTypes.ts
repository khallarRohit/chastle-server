export interface UserData {
  username: string,
  email: string,
  password: string,
}

export interface ApiResponse<T> { // standard API response structure 
  success: boolean,
  data?: T,
  error?: string
}
