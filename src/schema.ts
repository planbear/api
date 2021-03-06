import { gql } from 'apollo-server'

const schema = gql`
  # query

  type Query {
    notifications: [Notification]
    plan(planId: ID!): Plan
    plans(radius: Int!): [Plan]
    profile: User
  }

  # mutation

  type Mutation {
    approveMember(planId: ID!, userId: ID!): Member
    blockMember(planId: ID!, userId: ID!): Result
    createComment(planId: ID!, body: String!, pinned: Boolean): Comment
    createPlan(plan: PlanInput!): Plan
    joinPlan(planId: ID!): Plan
    login(email: String!, password: String!): AuthResult
    rateUser(planId: ID!, userId: ID!, rating: Int!): Result
    register(name: String!, email: String!, password: String!): AuthResult
    removeComment(planId: ID!, commentId: ID!): Result
    updateProfile(user: UserInput!): User
  }

  # types

  type User {
    id: ID!
    email: String!
    name: String!
    plans: [Plan!]!
    push: Boolean!
    rating: Float!
    version: Int!
    created: String!
  }

  type Notification {
    action: NotificationAction!
    id: ID!
    source: NotificationTarget!
    target: NotificationTarget!
    user: User!
    created: String!
    updated: String!
  }

  type Plan {
    id: ID!
    comments: [Comment!]
    description: String!
    expires: String!
    members: [Member!]
    meta: Meta!
    status: PlanStatus!
    time: String!
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
    max: Int!
  }

  type Member {
    id: ID!
    approved: Boolean!
    joined: String!
    name: String!
    rating: Float!
    owner: Boolean!
    version: Int!
  }

  enum PlanStatus {
    joined
    new
    requested
  }

  enum PlanType {
    beach
    concert
    educational
    movie
    road_trip
    shopping
  }

  enum NotificationAction {
    new_request
    new_comment
    request_approved
  }

  union NotificationTarget = Plan | User

  # input

  input PlanInput {
    description: String!
    expires: String
    location: LocationInput!
    max: Int
    time: String!
    type: PlanType!
  }

  input UserInput {
    name: String
    push: Boolean
    version: Int
  }

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
