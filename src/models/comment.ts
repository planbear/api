import moment from 'moment'
import { Document, Schema, Types, model } from 'mongoose'

import { User, UserDocument } from './user'

// interfaces

export interface CommentDocument extends Document {
  id: Types.ObjectId
  body: string
  pinned: boolean
  user: Types.ObjectId | UserDocument
  created: Date

  json(): unknown
}

// schema

export const comment = new Schema({
  body: {
    required: true,
    type: String
  },
  created: {
    default: new Date(),
    type: Date
  },
  pinned: {
    default: false,
    type: Boolean
  },
  user: {
    ref: 'User',
    type: Types.ObjectId
  }
})

// instance methods

comment.methods.json = function(this: CommentDocument): unknown {
  const { body, created, id, pinned, user } = this

  if (user instanceof User) {
    return {
      body,
      created: moment(created).toISOString(),
      id,
      pinned,
      user: {
        id: user.id,
        name: user.name
      }
    }
  }
}

// model

export const Comment = model<CommentDocument>('Comment', comment)
