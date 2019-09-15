const { MONGO_URI } = process.env

import { ApolloServer } from 'apollo-server'
import { applyMiddleware } from 'graphql-middleware'
import { makeExecutableSchema } from 'graphql-tools'
import { connect } from 'mongoose'

import auth, { getLocation, getUser } from './auth'
import resolvers from './resolvers'
import typeDefs from './schema'

!(async () => {
  connect(
    MONGO_URI as string,
    {
      useCreateIndex: true,
      useFindAndModify: true,
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
  )

  const schema = applyMiddleware(
    makeExecutableSchema({
      resolvers,
      typeDefs
    }),
    auth
  )

  const server = new ApolloServer({
    schema,
    async context({ req }) {
      const location = getLocation(req)
      const user = await getUser(req)

      return {
        location,
        user
      }
    }
  })

  const { url } = await server.listen()

  console.log(`🚀  Server ready at ${url}`)
})()
