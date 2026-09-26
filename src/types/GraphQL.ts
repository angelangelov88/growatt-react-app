// The envelope every GraphQL endpoint replies with.
type GraphQLResponse<T> = {
  data?: T | null;
  errors?: { message: string }[];
};

export type { GraphQLResponse };
