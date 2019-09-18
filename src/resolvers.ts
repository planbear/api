import { AuthenticationError } from 'apollo-server'
import { IResolvers } from 'graphql-tools'

import { Notification, Plan, Rating, User } from './models'
import { Context } from './types'

const resolvers: IResolvers<any, Context> = {
  Query: {
    async notifications(parent, args, { user }) {
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

    async profile(parent, args, { location, user }) {
      const plans = await Plan.find({
        $or: [
          {
            user: user._id
          },
          {
            'members.user': user._id
          }
        ]
      }).populate('user')

      return {
        ...user.json(),
        plans: plans.map(plan => plan.json(user, location))
      }
    },

    async plan(parent, { planId }, { location, user }) {
      const plan = await Plan.findById(planId)
        .populate('comments.user')
        .populate('members.user')
        .populate('user')

      if (!plan) {
        throw new Error('Plan not found')
      }

      if (plan.blocked.includes(user._id)) {
        throw new AuthenticationError('Plan not found')
      }

      return plan.json(user, location)
    },

    async plans(parent, { radius }, { location, user }) {
      const { latitude, longitude } = location

      const plans = await Plan.find({
        $or: [
          {
            $expr: {
              $gt: [
                '$max',
                {
                  $size: '$members'
                }
              ]
            }
          },
          {
            max: 0
          }
        ],
        blocked: {
          $nin: user._id
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
    async register(parent, { name, email, password }) {
      const { token, user } = await User.register(name, email, password)

      return {
        token,
        user: user.json()
      }
    },

    async login(parent, { email, password }) {
      const { token, user } = await User.login(email, password)

      return {
        token,
        user: user.json()
      }
    },

    async updateProfile(parent, { name, push }, { user }) {
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

    async createPlan(
      parent,
      { plan: { description, expires, max, time, type } },
      { location, user }
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

      await Plan.populate(plan, {
        path: 'members.user'
      })

      return plan.json(user, location)
    },

    async joinPlan(parent, { planId }, { location, user }) {
      const plan = await Plan.join(planId, user)

      return plan.json(user, location)
    },

    async approveMember(parent, { planId, userId }) {
      const member = await Plan.approveMember(planId, userId)

      return member
    },

    async blockMember(parent, { planId, userId }) {
      const success = await Plan.blockMember(planId, userId)

      return {
        success
      }
    },

    async rateUser(parent, { planId, rating, userId }, { user }) {
      const success = await Rating.add(rating, planId, userId, user)

      return {
        success
      }
    },

    async createComment(parent, { planId, body, pinned }, { user }) {
      const comment = await Plan.addComment(planId, body, pinned, user)

      return comment.json()
    },

    async removeComment(parent, { planId, commentId }) {
      const success = await Plan.removeComment(planId, commentId)

      return {
        success
      }
    }
  },

  NotificationTarget: {
    __resolveType({ __typename }: { __typename: string }) {
      return __typename
    }
  }
}

export default resolvers
