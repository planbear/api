import { IResolvers } from 'graphql-tools'

import { Plan, User } from './models'
import { Context } from './types'

const resolvers: IResolvers = {
  Query: {
    // profile
    profile(parent, args, { user }: Context) {
      return user.json()
    },

    // plan
    async plan(parent, { planId, location }, { user }: Context) {
      const plan = await Plan.findById(planId)

      if (!plan) {
        throw new Error('Plan not found')
      }

      await plan
        .populate('comments.user')
        .populate('members.user')
        .populate('user')
        .execPopulate()

      return plan.json(user, location)
    },

    // plans
    async plans(parent, { radius, location }, { user }: Context) {
      const plans = await Plan.findByLocation(location, radius)

      return plans.map(plan => plan.json(user, location))
    }
  },
  Mutation: {
    // register
    async register(parent, { name, email, password }) {
      const { token, user } = await User.register(name, email, password)

      return {
        token,
        user: user.json()
      }
    },

    // login
    async login(parent, { email, password }) {
      const { token, user } = await User.login(email, password)

      return {
        token,
        user: user.json()
      }
    },

    // update profile
    async updateProfile(parent, { name, notifications }, { user }: Context) {
      if (name !== undefined) {
        user.name = name
      }

      if (notifications !== undefined) {
        user.notifications = notifications
      }

      if (user.isModified()) {
        await user.save()
      }

      return user
    },

    // create plan
    async createPlan(
      parent,
      { description, location, type },
      { user }: Context
    ) {
      const plan = await Plan.add(user, description, type, location)

      await plan.populate('members.user').execPopulate()

      return plan.json(user, location)
    },

    // join plan
    async joinPlan(parent, { planId, location }, { user }: Context) {
      const plan = await Plan.join(planId, user)

      return plan.json(user, location)
    },

    // approve member
    async approveMember(parent, { planId, userId }) {
      const success = await Plan.approve(planId, userId)

      return {
        success
      }
    },

    // remove member
    async removeMember(parent, { planId, userId }) {
      const success = await Plan.removeMember(planId, userId)

      return {
        success
      }
    },

    // create comment
    async createComment(parent, { planId, body, pinned }, { user }: Context) {
      const comment = await Plan.addComment(planId, body, pinned, user)

      await comment.populate('user').execPopulate()

      return comment.json()
    },

    // remove comment
    async removeComment(parent, { planId, commentId }) {
      const success = await Plan.removeComment(planId, commentId)

      return {
        success
      }
    }
  }
}

export default resolvers
