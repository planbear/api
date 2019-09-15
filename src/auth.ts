const { SALT_ROUNDS, TOKEN_SECRET } = process.env

import { AuthenticationError } from 'apollo-server'
import { compare, hash } from 'bcrypt'
import { Request } from 'express'
import { and, rule, shield } from 'graphql-shield'
import { sign, verify } from 'jsonwebtoken'
import { get } from 'lodash'

import { Plan, User } from './models'
import { UserDocument } from './models/user'
import { Context } from './types'

export const createToken = (user: UserDocument) =>
  sign(
    {
      userId: user.id
    },
    TOKEN_SECRET as string
  )

export const signPassword = (password: string) =>
  hash(password, Number(SALT_ROUNDS))

export const verifyPassword = (user: UserDocument, password: string) =>
  compare(password, user.password)

export const getUser = async (req: Request) => {
  const auth = req.get('authorization')

  if (!auth) {
    return null
  }

  const token = auth.substr(7)

  if (!token) {
    throw new AuthenticationError('Invalid token')
  }

  const data = verify(token, TOKEN_SECRET as string)

  const id = get(data, 'userId')

  if (!id) {
    throw new AuthenticationError('Invalid token')
  }

  const user = await User.findById(id)

  if (!user) {
    throw new AuthenticationError('User not found')
  }

  return user
}

export const getLocation = (req: Request) => {
  const location = req.get('location')

  if (location) {
    const [latitude, longitude] = location.split(',')

    return {
      latitude: Number(latitude),
      longitude: Number(longitude)
    }
  }
}

const isAuthenticated = rule()(
  (parent, args, { user }: Context) => user !== null
)

const hasLocation = rule()(
  (parent, args, { location }: Context) => location !== null
)

const isPlanOwner = rule()(async (parent, { planId }, { user }: Context) => {
  const plan = await Plan.findById(planId)

  if (!plan) {
    throw new Error('Plan not found')
  }

  return plan.user.equals(user._id)
})

const isPlanMember = rule()(async (parent, { planId }, { user }: Context) => {
  const plan = await Plan.findById(planId)

  if (!plan) {
    throw new Error('Plan not found')
  }

  return Boolean(plan.members.find(member => member.user.equals(user._id)))
})

export default shield({
  Query: {
    notifications: isAuthenticated,
    plan: and(isAuthenticated, hasLocation),
    plans: and(isAuthenticated, hasLocation),
    profile: and(isAuthenticated, hasLocation)
  },
  Mutation: {
    approveMember: isPlanOwner,
    blockMember: isPlanOwner,
    createComment: isPlanMember,
    createPlan: isAuthenticated,
    joinPlan: and(isAuthenticated, hasLocation),
    rateUser: isAuthenticated,
    removeComment: isPlanOwner,
    updateProfile: isAuthenticated
  }
})
