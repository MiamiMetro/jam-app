import type { FunctionReturnType } from "convex/server";

import type { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";

type ProfileQueryReturn = FunctionReturnType<typeof api.profiles.getMe>;
export type User = NonNullable<ProfileQueryReturn>;

type PostQueryReturn = FunctionReturnType<typeof api.posts.getById>;
export type Post = NonNullable<PostQueryReturn>;

type PostFeedReturn = FunctionReturnType<typeof api.posts.getFeedPaginated>;
export type PostFeedItem = PostFeedReturn["page"][number];

type RoomsFeedReturn = FunctionReturnType<typeof api.rooms.listActivePaginated>;
export type RoomFeedItem = RoomsFeedReturn["page"][number];

type RoomDetailReturn = FunctionReturnType<typeof api.rooms.getByHandle>;
export type RoomDetail = NonNullable<RoomDetailReturn>;

type MyRoomReturn = FunctionReturnType<typeof api.rooms.getMyRoom>;
export type MyRoom = NonNullable<MyRoomReturn>;

type FriendsInRoomsReturn = FunctionReturnType<typeof api.rooms.getFriendsInRooms>;
export type FriendInRoomItem = FriendsInRoomsReturn[number];

type RoomParticipantsReturn = FunctionReturnType<typeof api.rooms.getParticipants>;
export type RoomParticipant = RoomParticipantsReturn["participants"][number];

type CommentsQueryReturn = FunctionReturnType<typeof api.comments.getByPostPaginated>;
export type Comment = CommentsQueryReturn["page"][number];

type MessagesQueryReturn = FunctionReturnType<typeof api.messages.getByConversationPaginated>;
export type Message = MessagesQueryReturn["data"][number];

type ConversationsQueryReturn = FunctionReturnType<typeof api.messages.getConversationsPaginated>;
export type Conversation = ConversationsQueryReturn["page"][number];

type CommunityQueryReturn = FunctionReturnType<typeof api.communities.getByHandle>;
export type CommunityItem = NonNullable<CommunityQueryReturn>;

type CommunitiesListReturn = FunctionReturnType<typeof api.communities.listPaginated>;
export type CommunityListItem = CommunitiesListReturn["page"][number];

type ProfilePostsReturn = FunctionReturnType<typeof api.posts.getByUsernamePaginated>;
export type ProfilePostItem = ProfilePostsReturn["page"][number];

type MyTracksReturn = FunctionReturnType<typeof api.myTracks.getMyTracks>;
export type MyTrackItem = MyTracksReturn["page"][number];

type BandListingsReturn = FunctionReturnType<typeof api.bands.getMyListingsPaginated>;
export type BandListingItem = BandListingsReturn["page"][number];

type BandApplicationsReturn = FunctionReturnType<typeof api.bands.getApplications>;
export type BandApplicationItem = BandApplicationsReturn["page"][number];

export type { Doc, Id } from "../../../convex/_generated/dataModel";

type CoreTables =
  | "profiles"
  | "posts"
  | "comments"
  | "messages"
  | "conversations"
  | "rooms"
  | "communities"
  | "band_listings"
  | "band_applications"
  | "my_tracks";

export type ConvexDoc<T extends CoreTables> = Doc<T>;
export type ConvexId<T extends CoreTables> = Id<T>;
