import {
  Document,
  Model,
  MongooseDocument,
  Schema,
  Types,
  model
} from 'mongoose'

import { geo } from '../lib'
import { Location } from '../types'
import { Comment, CommentDocument, comment } from './comment'
import { Member, MemberDocument, member } from './member'
import {
  Notification,
  NotificationAction,
  NotificationTargetType
} from './notification'
import { User, UserDocument } from './user'

// interfaces

enum PlanType {
  BEACH = 'beach',
  CONCERT = 'concert',
  EDUCATIONAL = 'educational',
  MOVIE = 'movie',
  ROAD_TRIP = 'road_trip',
  SHOPPING = 'shopping'
}

interface PlanInput {
  description: string
  expires?: string
  location: Location
  max?: number
  time: string
  type: PlanType
  user: UserDocument
}

export interface PlanDocument extends Document {
  id: Types.ObjectId
  blocked: Types.ObjectId[]
  comments: CommentDocument[]
  description: string
  expires: Date
  location: number[]
  max: number
  members: MemberDocument[]
  time: Date
  type: PlanType
  user: Types.ObjectId | UserDocument
  created: Date
  updated: Date

  json(user: UserDocument, location: Location): unknown
}

export interface PlanModel extends Model<PlanDocument> {
  add(input: PlanInput): Promise<PlanDocument>
  addComment(
    planId: string,
    body: string,
    pinned: boolean,
    user: UserDocument
  ): Promise<CommentDocument>
  approveMember(planId: string, userId: string): Promise<MemberDocument>
  blockMember(planId: string, userId: string): Promise<boolean>
  join(planId: string, user: UserDocument): Promise<PlanDocument>
  removeComment(postId: string, commentId: string): Promise<boolean>
}

// schema

const plan = new Schema(
  {
    blocked: {
      type: [Types.ObjectId]
    },
    comments: {
      type: [comment]
    },
    description: {
      required: true,
      type: String
    },
    expires: {
      type: Date
    },
    location: {
      index: '2d',
      required: true,
      type: [Number]
    },
    max: {
      default: 0,
      type: Number
    },
    members: {
      type: [member]
    },
    time: {
      required: true,
      type: Date
    },
    type: {
      enum: Object.values(PlanType),
      required: true,
      type: String
    },
    user: {
      index: true,
      ref: 'User',
      type: Types.ObjectId
    }
  },
  {
    timestamps: {
      createdAt: 'created',
      updatedAt: 'updated'
    }
  }
)

// instance methods

plan.methods.json = function(
  this: PlanDocument,
  user: UserDocument,
  location: Location
): unknown {
  const {
    comments,
    created,
    description,
    expires,
    id,
    max,
    members,
    time,
    type,
    updated
  } = this

  const distance = geo.distance(this.location, location)

  const approvedMembers = members.filter(({ approved }) => approved)

  const requested = Boolean(
    members.find(member => {
      if (member.user instanceof User) {
        return member.user.id === user.id && member.joined
      }

      return member.user.equals(user._id) && member.joined
    })
  )
  const joined = Boolean(
    approvedMembers.find(member => {
      if (member.user instanceof User) {
        return member.user.id === user.id && member.approved
      }

      return member.user.equals(user._id) && member.approved
    })
  )

  const status = joined ? 'joined' : requested ? 'requested' : 'new'

  return {
    comments: joined
      ? comments.map(comment => comment.json()).filter(Boolean)
      : [],
    created: created.toISOString(),
    description,
    expires: expires
      ? expires !== time
        ? expires.toISOString()
        : undefined
      : undefined,
    id,
    members: joined
      ? members
          .filter(member => {
            if (this.user instanceof User) {
              return this.user.equals(user._id) || member.approved
            }

            return this.user.equals(user._id) || member.approved
          })
          .map(member => member.json(user))
          .filter(Boolean)
      : [],
    meta: {
      comments: comments.length,
      distance,
      going: approvedMembers.length,
      max
    },
    status,
    time: time.toISOString(),
    type,
    updated: updated.toISOString(),
    user: this.user instanceof User && this.user.json()
  }
}

// static methods

plan.statics.add = async function(
  this: PlanModel,
  { description, expires, location, max, time, type, user }: PlanInput
): Promise<PlanDocument> {
  const { latitude, longitude } = location

  const owner = new Member({
    approved: true,
    user
  })

  const plan = await this.create({
    description,
    expires: expires || time,
    location: [longitude, latitude],
    max,
    members: [owner],
    time,
    type,
    user
  })

  return plan
}

plan.statics.join = async function(
  this: PlanModel,
  planId: string,
  user: UserDocument
): Promise<PlanDocument> {
  const plan = await this.findById(planId)

  if (!plan) {
    throw new Error('Plan not found')
  }

  const exists = plan.members.find(member => member.user.equals(user._id))

  if (exists) {
    return plan
  }

  const member = new Member({
    user
  })

  plan.members.push(member)

  await plan.save()

  await Notification.notify({
    action: NotificationAction.NEW_REQUEST,
    source: user,
    sourceType: NotificationTargetType.USER,
    target: plan,
    targetType: NotificationTargetType.PLAN,
    user: plan.user
  })

  return plan
}

plan.statics.approveMember = async function(
  this: PlanModel,
  planId: string,
  userId: string
): Promise<MemberDocument> {
  const plan = await this.findById(planId)

  if (!plan) {
    throw new Error('Plan not found')
  }

  const member = plan.members.find(member =>
    member.user.equals(userId as MongooseDocument['_id'])
  )

  if (!member) {
    throw new Error('Member not found')
  }

  member.approved = true

  await plan.save()

  await Notification.notify({
    action: NotificationAction.REQUEST_APPROVED,
    source: plan.user,
    sourceType: NotificationTargetType.USER,
    target: plan,
    targetType: NotificationTargetType.PLAN,
    user: member.user
  })

  return member
}

plan.statics.blockMember = async function(
  this: PlanModel,
  planId: string,
  userId: string
): Promise<boolean> {
  const plan = await this.findById(planId)

  if (!plan) {
    throw new Error('Plan not found')
  }

  const index = plan.members.findIndex(member =>
    member.user.equals(userId as MongooseDocument['_id'])
  )

  if (index >= 0) {
    plan.members.splice(index, 1)
  }

  if (!plan.blocked.includes(userId as MongooseDocument['_id'])) {
    plan.blocked.push(userId as MongooseDocument['_id'])
  }

  await plan.save()

  return true
}

plan.statics.addComment = async function(
  this: PlanModel,
  planId: string,
  body: string,
  pinned: boolean,
  user: UserDocument
): Promise<CommentDocument> {
  const plan = await this.findById(planId)

  if (!plan) {
    throw new Error('Plan not found')
  }

  const comment = new Comment({
    body,
    pinned: plan.user.equals(user._id) ? pinned : false,
    user
  })

  plan.comments.push(comment)

  await plan.save()

  await Notification.notifyMultiple({
    action: NotificationAction.NEW_COMMENT,
    source: user,
    sourceType: NotificationTargetType.USER,
    target: plan,
    targetType: NotificationTargetType.PLAN,
    users: plan.members
      .filter(member => !member.user.equals(user._id))
      .map(member => member.user)
  })

  return comment
}

plan.statics.removeComment = async function(
  this: PlanModel,
  postId: string,
  commentId: string
): Promise<boolean> {
  const plan = await this.findById(postId)

  if (!plan) {
    throw new Error('Plan not found')
  }

  const index = plan.comments.findIndex(comment =>
    comment._id.equals(commentId)
  )

  if (index < 0) {
    throw new Error('Comment not found')
  }

  plan.comments.splice(index, 1)

  await plan.save()

  return true
}

// model

export const Plan = model<PlanDocument, PlanModel>('Plan', plan)
