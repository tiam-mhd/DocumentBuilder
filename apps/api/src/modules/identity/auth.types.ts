export type AccessTokenPayload = {
  sub: string;
  mobile: string;
  jti: string;
};

export type RequestUser = {
  userId: string;
  mobile: string;
  jti: string;
};
