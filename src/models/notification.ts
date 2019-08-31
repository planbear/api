import { Document, Model, Schema, Types, model } from 'mongoose'

import { Plan, PlanDocument } from './plan'
import { User, UserDocument } from './user'

// interfaces

export enum NotificationAction {
  NEW_REQUEST = 'new_request',
  NEW_COMMENT = 'new_comment',
  REQUEST_APPROVED = 'request_approved'
}

export enum NotificationTargetType {
  PLAN = 'Plan',
  USER = 'User'
}

interface NotificationOneInput {
  action: NotificationAction
  source: Types.ObjectId | PlanDocument | UserDocument
  sourceType: NotificationTargetType
  target: Types.ObjectId | PlanDocument | UserDocument
  targetType: NotificationTargetType
  user: Types.ObjectId | UserDocument
}

interface NotificationMultipleInput {
  action: NotificationAction
  source: Types.ObjectId | PlanDocument | UserDocument
  sourceType: NotificationTargetType
  target: Types.ObjectId | PlanDocument | UserDocument
  targetType: NotificationTargetType
  users: (Types.ObjectId | UserDocument)[]
}

export interface NotificationDocument extends Document {
  id: Types.ObjectId
  action: NotificationAction
  source: Types.ObjectId | PlanDocument | UserDocument
  sourceType: NotificationTargetType
  target: Types.ObjectId | PlanDocument | UserDocument
  targetType: NotificationTargetType
  user: Types.ObjectId | UserDocument
  created: Date
  updated: Date

  json(): unknown
}

export interface NotificationModel extends Model<NotificationDocument> {
  notify(input: NotificationOneInput): void
  notifyMultiple(input: NotificationMultipleInput): void
}

// schema

const notification = new Schema(
  {
    action: {
      enum: Object.values(NotificationAction),
      required: true,
      type: String
    },
    source: {
      refPath: 'sourceType',
      required: true,
      type: Types.ObjectId
    },
    sourceType: {
      enum: Object.values(NotificationTargetType),
      required: true,
      type: String
    },
    target: {
      refPath: 'targetType',
      required: true,
      type: Types.ObjectId
    },
    targetType: {
      enum: Object.values(NotificationTargetType),
      required: true,
      type: String
    },
    user: {
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

notification.methods.json = function(this: NotificationDocument): unknown {
  const { action, created, id, source, target, updated, user } = this

  let _source

  if (source instanceof Plan) {
    _source = {
      __typename: 'Plan',
      id: source.id,
      type: source.type
    }
  } else if (source instanceof User) {
    _source = {
      __typename: 'User',
      id: source.id,
      name: source.name
    }
  }

  let _target

  if (target instanceof Plan) {
    _target = {
      __typename: 'Plan',
      id: target.id,
      type: target.type
    }
  } else if (target instanceof User) {
    _target = {
      __typename: 'User',
      id: target.id,
      name: target.name
    }
  }

  return {
    action,
    created: created.toISOString(),
    id,
    source: _source,
    target: _target,
    updated: updated.toISOString(),
    user: user instanceof User && {
      id: user.id,
      name: user.name
    }
  }
}

// static methods

notification.statics.notify = async function(
  this: NotificationModel,
  { action, source, sourceType, target, targetType, user }: NotificationOneInput
): Promise<void> {
  await this.create({
    action,
    source,
    sourceType,
    target,
    targetType,
    user
  })
}

notification.statics.notifyMultiple = async function(
  this: NotificationModel,
  {
    action,
    source,
    sourceType,
    target,
    targetType,
    users
  }: NotificationMultipleInput
): Promise<void> {
  await this.create(
    users.map(user => ({
      action,
      source,
      sourceType,
      target,
      targetType,
      user
    }))
  )
}

// model

export const Notification = model<NotificationDocument, NotificationModel>(
  'Notification',
  notification
)
