import { Document, Schema, Types, model } from 'mongoose'

import { User, UserDocument } from './user'

// interfaces

export interface MemberDocument extends Document {
  id: Types.ObjectId
  approved: boolean
  joined: Date
  user: Types.ObjectId | UserDocument

  json(): unknown
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
    type: Schema.Types.ObjectId
  }
})

// instance methods

member.methods.json = function(this: MemberDocument): unknown {
  const { approved, joined, user } = this

  if (user instanceof User) {
    const { id, name } = user

    return {
      approved,
      id,
      joined: joined.toISOString(),
      name,
      owner: this.user.equals(user._id)
    }
  }
}

// model

export const Member = model<MemberDocument>('Member', member)
