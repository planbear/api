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

export interface PlanDocument extends Document {
  id: Types.ObjectId
  comments: CommentDocument[]
  description: string
  location: number[]
  members: MemberDocument[]
  type: PlanType
  user: Types.ObjectId | UserDocument
  created: Date
  updated: Date

  json(user: UserDocument, location: Location): unknown
}

export interface PlanModel extends Model<PlanDocument> {
  add(
    user: UserDocument,
    description: string,
    type: PlanType,
    location: Location
  ): PlanDocument
  addComment(
    planId: string,
    body: string,
    pinned: boolean,
    user: UserDocument
  ): CommentDocument
  approve(planId: string, userId: string): boolean
  findByLocation(location: Location, radius: number): PlanDocument[]
  join(planId: string, user: UserDocument): PlanDocument
  removeComment(postId: string, commentId: string): boolean
  removeMember(postId: string, userId: string): boolean
}

// schema

const plan = new Schema(
  {
    comments: {
      type: [comment]
    },
    description: {
      required: true,
      type: String
    },
    location: {
      required: true,
      type: [Number]
    },
    members: {
      type: [member]
    },
    type: {
      enum: Object.values(PlanType),
      required: true,
      type: String
    },
    user: {
      ref: 'User',
      type: Schema.Types.ObjectId
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
  const { comments, created, description, id, members, type, updated } = this

  const distance = geo.distance(this.location, location)

  const approved = members.filter(({ approved }) => approved)

  const applied = Boolean(
    members.find(member => {
      if (member.user instanceof User) {
        return member.user.id === user.id && member.joined
      }

      return member.user.equals(user._id) && member.joined
    })
  )
  const joined = Boolean(
    approved.find(member => {
      if (member.user instanceof User) {
        return member.user.id === user.id && member.approved
      }

      return member.user.equals(user._id) && member.approved
    })
  )

  const status = joined ? 'joined' : applied ? 'applied' : 'new'

  return {
    comments: joined && comments.map(comment => comment.json()).filter(Boolean),
    created,
    description,
    id,
    members: joined && members.map(member => member.json()).filter(Boolean),
    meta: {
      comments: comments.length,
      distance,
      going: approved.length
    },
    status,
    type,
    updated
  }
}

// static methods

plan.statics.findByLocation = async function(
  this: PlanModel,
  location: Location,
  radius: number
): Promise<PlanDocument[]> {
  const query = geo.buildQuery(location, radius)

  const plans = await this.find(query)

  return plans
}

plan.statics.add = async function(
  this: PlanModel,
  user: UserDocument,
  description: string,
  type: PlanType,
  location: Location
): Promise<PlanDocument> {
  const { latitude, longitude } = location

  const owner = new Member({
    approved: true,
    user
  })

  const plan = await this.create({
    description,
    location: [longitude, latitude],
    members: [owner],
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

  const exists = plan.members.find(person => person.user.equals(user._id))

  if (exists) {
    return plan
  }

  const member = new Member({
    user
  })

  plan.members.push(member)

  await plan.save()

  return plan
}

plan.statics.approve = async function(
  this: PlanModel,
  planId: string,
  userId: string
): Promise<boolean> {
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

  const index = plan.comments.findIndex(comment => comment.id.equals(commentId))

  if (index < 0) {
    throw new Error('Comment not found')
  }

  plan.comments.splice(index, 1)

  await plan.save()

  return true
}

plan.statics.removeMember = async function(
  this: PlanModel,
  postId: string,
  userId: string
): Promise<boolean> {
  const plan = await this.findById(postId)

  if (!plan) {
    throw new Error('Plan not found')
  }

  const index = plan.members.findIndex(member =>
    member.user.equals(userId as MongooseDocument['_id'])
  )

  if (index < 0) {
    throw new Error('Member not found')
  }

  plan.members.splice(index, 1)

  await plan.save()

  return true
}

// model

export const Plan = model<PlanDocument, PlanModel>('Plan', plan)
