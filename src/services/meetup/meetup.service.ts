import { Injectable } from '@nestjs/common';
import {
  ApolloClient,
  HttpLink,
  InMemoryCache,
  TypedDocumentNode,
  gql,
} from '@apollo/client';
import { EventEdge, Query } from '../../types/__generated__/graphql';

@Injectable()
export class MeetupService {
  constructor() {}

  public async getEvents(): Promise<EventEdge[] | undefined> {
    const client = new ApolloClient({
      link: new HttpLink({ uri: 'https://api.meetup.com/gql-ext' }),
      cache: new InMemoryCache(),
    });

    const GET_GROUP_BY_URLNAME: TypedDocumentNode<Query, { urlname: string }> =
      gql`
        query GetEvents($urlname: String!) {
          groupByUrlname(urlname: $urlname) {
            events {
              edges {
                node {
                  dateTime
                  description
                  eventUrl
                  id
                  title
                  venues {
                    address
                    city
                    state
                    postalCode
                    name
                    venueType
                  }
                }
              }
            }
          }
        }
      `;

    const response = await client.query({
      query: GET_GROUP_BY_URLNAME,
      variables: {
        urlname: 'gamedevin',
      },
    });

    return response.data?.groupByUrlname?.events.edges;
  }
}
