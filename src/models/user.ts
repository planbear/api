import { Document, Model, Schema, Types, model } from 'mongoose'

import { createToken, signPassword, verifyPassword } from '../auth'

// interfaces

interface AuthResult {
  token: string
  user: UserDocument
}

export interface UserDocument extends Document {
  id: Types.ObjectId
  name: string
  email: string
  password: string
  notifications: boolean
  created: Date
  updated: Date

  json(): unknown
}

export interface UserModel extends Model<UserDocument> {
  register(name: string, email: string, password: string): AuthResult
  login(email: string, password: string): AuthResult
}

// schema

const user = new Schema(
  {
    email: {
      required: true,
      type: String
    },
    name: {
      required: true,
      type: String
    },
    notifications: {
      default: true,
      type: Boolean
    },
    password: {
      required: true,
      type: String
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

user.methods.json = function(this: UserDocument): unknown {
  const { created, email, id, name, notifications } = this

  return {
    created: created.toISOString(),
    email,
    id,
    name,
    notifications
  }
}

// static methods

user.statics.register = async function(
  this: UserModel,
  name: string,
  email: string,
  password: string
): Promise<AuthResult> {
  const user = await this.create({
    email,
    name,
    password: await signPassword(password)
  })

  const token = createToken(user)

  return {
    token,
    user
  }
}

user.statics.login = async function(
  this: UserModel,
  email: string,
  password: string
): Promise<AuthResult> {
  const user = await this.findOne()
    .where('email')
    .equals(email)

  if (!user) {
    throw new Error('User not found')
  }

  const correct = await verifyPassword(user, password)

  if (!correct) {
    throw new Error('Invalid password')
  }

  const token = createToken(user)

  return {
    token,
    user
  }
}

// model

export const User = model<UserDocument, UserModel>('User', user)
