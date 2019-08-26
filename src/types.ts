import { UserDocument } from './models/user'

export interface Context {
  user: UserDocument
}

export interface Location {
  latitude: number
  longitude: number
}
