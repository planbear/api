import { getDistance } from 'geolib'

import { Location } from '../types'

class Geo {
  distance(coordinates: number[], location: Location): number {
    const [longitude, latitude] = coordinates

    return getDistance(
      {
        latitude,
        longitude
      },
      {
        latitude: location.latitude,
        longitude: location.longitude
      }
    )
  }
}

export default new Geo()
