import { getDistance } from 'geolib'

import { Location } from '../types'

export default class Geo {
  static buildQuery(location: Location, radius: number): unknown {
    const { latitude, longitude } = location

    return {
      location: {
        $geoWithin: {
          $centerSphere: [[longitude, latitude], radius / 6378.1]
        }
      }
    }
  }

  static distance(coordinates: number[], location: Location): number {
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
