export interface ZmVersion {
  version: string;
  apiversion: string;
}

export interface ZmToken {
  access_token: string;
  access_token_expires: number;
  refresh_token: string;
  refresh_token_expires: number;
  credentials: string;
  append_password: number;
  version: string;
  apiversion: string;
}

export interface ZmError {
  success: boolean;
  data: {
    name: string;
    message: string;
    url: string;
    exception: {
      class: string;
      code: number;
      message: string;
    };
  };
}

export interface LoginForm {
  host: string;
  user: string;
  password: string;
}

export const StorageKeys = {
  CREDENTIALS: 'credentials',
  TOKEN: 'token'
};
