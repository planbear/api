const { MONGO_URI } = process.env

import { ApolloServer } from 'apollo-server'
import { applyMiddleware } from 'graphql-middleware'
import { makeExecutableSchema } from 'graphql-tools'
import { connect } from 'mongoose'

import auth, { getUser } from './auth'
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
      const user = await getUser(req)

      return {
        user
      }
    }
  })

  const { url } = await server.listen()

  console.log(`🚀  Server ready at ${url}`)
})()
