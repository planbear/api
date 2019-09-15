import { sumBy } from 'lodash'
import { Document, Model, Schema, Types, model } from 'mongoose'

import { PlanDocument } from './plan'
import { User, UserDocument } from './user'

// interfaces

export interface RatingDocument extends Document {
  id: Types.ObjectId
  by: Types.ObjectId | UserDocument
  rating: number
  plan: Types.ObjectId | PlanDocument
  user: Types.ObjectId | UserDocument
  created: Date
  updated: Date
}

export interface RatingModel extends Model<RatingDocument> {
  add(
    rating: number,
    planId: Types.ObjectId,
    userId: Types.ObjectId,
    user: UserDocument
  ): Promise<boolean>
}

// schema

export const rating = new Schema(
  {
    by: {
      ref: 'User',
      required: true,
      type: Types.ObjectId
    },
    plan: {
      ref: 'Plan',
      required: true,
      type: Types.ObjectId
    },
    rating: {
      max: 5,
      min: 1,
      required: true,
      type: Number
    },
    user: {
      ref: 'User',
      required: true,
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

// static methods

rating.statics.add = async function(
  this: RatingModel,
  rating: number,
  planId: Types.ObjectId,
  userId: Types.ObjectId,
  user: UserDocument
): Promise<boolean> {
  const existing = await this.findOne({
    by: user._id,
    plan: planId,
    user: userId
  })

  if (existing) {
    existing.rating = rating

    if (existing.isModified()) {
      await existing.save()
    } else {
      return true
    }
  } else {
    await this.create({
      by: user,
      plan: planId,
      rating,
      user: userId
    })
  }

  const ratings = await this.find({
    user: userId
  })

  const updatedRating =
    (sumBy(ratings, 'rating') + 5) / (ratings.length + 1) || 0

  await User.findByIdAndUpdate(userId, {
    rating: updatedRating
  })

  return true
}

// model

export const Rating = model<RatingDocument, RatingModel>('Rating', rating)
