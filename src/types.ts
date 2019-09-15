import { UserDocument } from './models/user'

export interface Context {
  location: Location
  user: UserDocument
}

export interface Location {
  latitude: number
  longitude: number
}
