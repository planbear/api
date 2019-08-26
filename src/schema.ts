import { gql } from 'apollo-server'

const schema = gql`
  # query

  type Query {
    plan(planId: ID!, location: LocationInput!): Plan
    plans(location: LocationInput!, radius: Int!): [Plan]
    profile: User
  }

  # mutation

  type Mutation {
    approveMember(planId: ID!, userId: ID!): Result
    createComment(planId: ID!, body: String!, pinned: Boolean): Comment
    createPlan(
      description: String!
      type: PlanType!
      location: LocationInput!
    ): Plan
    joinPlan(planId: ID!, location: LocationInput!): Plan
    login(email: String!, password: String!): AuthResult
    register(name: String!, email: String!, password: String!): AuthResult
    removeComment(planId: ID!, commentId: ID!): Result
    removeMember(planId: ID!, userId: ID!): Result
    updateProfile(name: String, notifications: Boolean): User
  }

  # types

  type User {
    id: ID!
    email: String!
    name: String!
    notifications: Boolean!
    created: String!
    updated: String!
  }

  type Plan {
    id: ID!
    comments: [Comment!]
    description: String!
    members: [Member!]
    meta: Meta!
    status: String!
    type: PlanType!
    user: User!
    created: String!
    updated: String!
  }

  type Comment {
    id: ID!
    body: String!
    pinned: Boolean!
    user: User!
    created: String!
  }

  type Meta {
    comments: Int!
    distance: Float!
    going: Int!
  }

  type Member {
    id: ID!
    approved: Boolean!
    joined: String!
    name: String!
    owner: Boolean!
  }

  enum PlanType {
    beach
    concert
    educational
    movie
    road_trip
    shopping
  }

  # input

  input LocationInput {
    latitude: Float!
    longitude: Float!
  }

  # result

  type AuthResult {
    token: String!
    user: User!
  }

  type Result {
    success: Boolean!
  }
`

export default schema
