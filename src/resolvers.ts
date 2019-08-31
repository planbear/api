import { IResolvers } from 'graphql-tools'

import { Notification, Plan, User } from './models'
import { Context } from './types'

const resolvers: IResolvers = {
  Query: {
    // notifications
    async notifications(parent, args, { user }: Context) {
      const notifications = await Notification.find()
        .where('user')
        .equals(user.id)
        .sort({
          created: 1
        })
        .populate('source')
        .populate('target')
        .populate('user')

      return notifications.map(notification => notification.json())
    },

    // profile
    profile(parent, args, { user }: Context) {
      return user.json()
    },

    // plan
    async plan(parent, { planId, location }, { user }: Context) {
      const plan = await Plan.findById(planId)
        .populate('comments.user')
        .populate('members.user')
        .populate('user')

      if (!plan) {
        throw new Error('Plan not found')
      }

      return plan.json(user, location)
    },

    // plans
    async plans(parent, { radius, location }, { user }: Context) {
      const { latitude, longitude } = location

      const plans = await Plan.find({
        $expr: {
          $gt: [
            '$max',
            {
              $size: '$members'
            }
          ]
        },
        location: {
          $geoWithin: {
            $centerSphere: [[longitude, latitude], radius / 6378.1]
          }
        },
        expires: {
          $gt: new Date()
        }
      }).populate('user')

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
    async updateProfile(parent, { name, push }, { user }: Context) {
      if (name !== undefined) {
        user.name = name
      }

      if (push !== undefined) {
        user.push = push
      }

      if (user.isModified()) {
        await user.save()
      }

      return user
    },

    // create plan
    async createPlan(
      parent,
      { plan: { description, expires, location, max, time, type } },
      { user }: Context
    ) {
      const plan = await Plan.add({
        description,
        expires,
        location,
        max,
        time,
        type,
        user
      })
        .populate('members.user')
        .execPopulate()

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
