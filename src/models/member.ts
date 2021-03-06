import moment from 'moment'
import { Document, Schema, Types, model } from 'mongoose'

import { User, UserDocument } from './user'

// interfaces

export interface MemberDocument extends Document {
  id: Types.ObjectId
  approved: boolean
  joined: Date
  user: Types.ObjectId | UserDocument

  json(user: UserDocument): unknown
}

// schema

export const member = new Schema({
  approved: {
    default: false,
    type: Boolean
  },
  joined: {
    default: new Date(),
    required: true,
    type: Date
  },
  user: {
    ref: 'User',
    type: Types.ObjectId
  }
})

// instance methods

member.methods.json = function(
  this: MemberDocument,
  user: UserDocument
): unknown {
  const { approved, joined } = this

  if (this.user instanceof User) {
    return {
      ...this.user.json(),
      approved,
      joined: moment(joined).toISOString(),
      owner: this.user.equals(user._id)
    }
  }
}

// model

export const Member = model<MemberDocument>('Member', member)
