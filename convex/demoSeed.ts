import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

type ProfileSeed = {
  username: string;
  displayName: string;
  bio: string;
  instruments: string[];
  genres: string[];
  dmPrivacy?: "friends" | "everyone";
};

const now = () => Date.now();

const avatar = (seed: string) =>
  `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(seed)}`;

const banner =
  "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1600&q=80";

const audio = (track: number) =>
  `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${track}.mp3`;

const profiles: ProfileSeed[] = [
  {
    username: "berkayjam",
    displayName: "Berkay Demir",
    bio: "Istanbul merkezli prodüktör. Gecelik jam, lo-fi beat ve indie vokal fikirleri topluyorum.",
    instruments: ["Producer", "Guitar", "Synth"],
    genres: ["Lo-Fi", "Indie", "Electronic"],
    dmPrivacy: "everyone",
  },
  {
    username: "melodya",
    displayName: "Melody Akin",
    bio: "Vokalist ve söz yazarı. R&B melodileri, minimal armoniler ve sahne enerjisi.",
    instruments: ["Vocals", "Piano"],
    genres: ["R&B", "Pop", "Soul"],
    dmPrivacy: "everyone",
  },
  {
    username: "kaanbeats",
    displayName: "Kaan Arslan",
    bio: "Hip hop davulları, sample chopping ve analog synth bass hatları.",
    instruments: ["Producer", "DJ", "Synth"],
    genres: ["Hip Hop", "House", "Electronic"],
    dmPrivacy: "everyone",
  },
  {
    username: "dilanjazz",
    displayName: "Dilan Kara",
    bio: "Caz vokal, kontrpuan ve küçük kulüp jamleri. Standartlara modern dokunuşlar.",
    instruments: ["Vocals", "Saxophone"],
    genres: ["Jazz", "R&B", "Ambient"],
    dmPrivacy: "friends",
  },
  {
    username: "efe_groove",
    displayName: "Efe Yilmaz",
    bio: "Davulcu. Funk pocket, odd meter ve canlı performans provaları.",
    instruments: ["Drums", "Bass"],
    genres: ["Rock", "Funk", "Jazz"],
    dmPrivacy: "everyone",
  },
  {
    username: "zeynepsynth",
    displayName: "Zeynep Sari",
    bio: "Modüler synth, ambient texture ve soundtrack fikirleri.",
    instruments: ["Synth", "Keys", "Producer"],
    genres: ["Ambient", "Electronic", "Classical"],
    dmPrivacy: "everyone",
  },
  {
    username: "mertbass",
    displayName: "Mert Can",
    bio: "Bas gitar ve groove odaklı düzenlemeler. Sahneye hazır fikirleri seviyorum.",
    instruments: ["Bass", "Guitar"],
    genres: ["Rock", "Indie", "Pop"],
    dmPrivacy: "friends",
  },
  {
    username: "selinmix",
    displayName: "Selin Oz",
    bio: "Mix engineer. Vokal zincirleri, düşük frekans temizliği ve final polish.",
    instruments: ["Producer", "DJ"],
    genres: ["House", "Pop", "Electronic"],
    dmPrivacy: "everyone",
  },
];

export const populate = internalMutation({
  args: {
    mode: v.optional(v.union(v.literal("append"), v.literal("resetDemo"))),
  },
  handler: async (ctx, args) => {
    const mode = args.mode ?? "append";

    if (mode === "resetDemo") {
      await resetDemoRows(ctx);
    }

    const createdAt = now();
    const profileIds: Record<string, Id<"profiles">> = {};

    for (const profile of profiles) {
      const existing = await ctx.db
        .query("profiles")
        .withIndex("by_username", (q) => q.eq("username", profile.username))
        .first();

      if (existing) {
        profileIds[profile.username] = existing._id;
        continue;
      }

      const profileId = await ctx.db.insert("profiles", {
        authIssuer: "demo-seed",
        authSubject: profile.username,
        username: profile.username,
        displayName: profile.displayName,
        avatarUrl: avatar(profile.username),
        bannerUrl: banner,
        bio: profile.bio,
        instruments: profile.instruments,
        genres: profile.genres,
        accountState: "active",
        stateChangedAt: createdAt,
        dmPrivacy: profile.dmPrivacy ?? "everyone",
      });
      profileIds[profile.username] = profileId;
      await insertUniqueLock(ctx, "username", profile.username, profileId);
    }

    const officialServerId = await ctx.db.insert("jam_servers", {
      kind: "official",
      status: "enabled",
      serverId: "jam-demo-eu-1",
      name: "Jam Demo EU",
      host: "127.0.0.1",
      port: 9999,
      joinSecret: "demo-secret-only-for-local-video",
      priority: 1,
      region: "Istanbul",
      createdAt,
      updatedAt: createdAt,
    });

    const communityIds = await seedCommunities(ctx, profileIds, createdAt);
    const postIds = await seedPosts(ctx, profileIds, communityIds);
    const commentIds = await seedComments(ctx, profileIds, postIds);
    await seedLikes(ctx, profileIds, postIds, commentIds);
    await seedRooms(ctx, profileIds, communityIds, officialServerId, createdAt);
    await seedFriendships(ctx, profileIds);
    await seedConversations(ctx, profileIds, createdAt);
    await seedBands(ctx, profileIds, createdAt);
    await seedTracks(ctx, profileIds, createdAt);
    await seedReports(ctx, profileIds, postIds, communityIds, createdAt);

    return {
      profiles: Object.keys(profileIds).length,
      communities: Object.keys(communityIds).length,
      posts: postIds.length,
      comments: commentIds.length,
      message: "Demo seed completed",
    };
  },
});

export const linkDemoAccount = internalMutation({
  args: {
    username: v.string(),
    authIssuer: v.string(),
    authSubject: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();
    if (!profile) {
      throw new Error("PROFILE_NOT_FOUND");
    }

    const existingForIdentity = await ctx.db
      .query("profiles")
      .withIndex("by_auth_identity", (q) =>
        q.eq("authIssuer", args.authIssuer).eq("authSubject", args.authSubject)
      )
      .first();
    if (existingForIdentity && existingForIdentity._id !== profile._id) {
      throw new Error("AUTH_IDENTITY_ALREADY_LINKED");
    }

    await ctx.db.patch(profile._id, {
      authIssuer: args.authIssuer,
      authSubject: args.authSubject,
    });

    return {
      id: profile._id,
      username: profile.username,
      authIssuer: args.authIssuer,
      authSubject: args.authSubject,
    };
  },
});

async function insertUniqueLock(
  ctx: MutationCtx,
  scope: string,
  value: string,
  ownerId: string
) {
  const existing = await ctx.db
    .query("unique_locks")
    .withIndex("by_scope_value", (q) => q.eq("scope", scope).eq("value", value))
    .first();
  if (!existing) {
    await ctx.db.insert("unique_locks", {
      scope,
      value,
      ownerId,
      createdAt: now(),
    });
  }
}

async function seedCommunities(
  ctx: MutationCtx,
  ids: Record<string, Id<"profiles">>,
  createdAt: number
) {
  const communities = [
    {
      key: "lofi",
      name: "Lo-Fi Istanbul",
      handle: "lofi_istanbul",
      description:
        "Gece kayıtları, düşük tempolu beatler ve hızlı feedback için sakin bir topluluk.",
      themeColor: "amber",
      tags: ["LoFi", "Late Night", "Collab"],
      owner: "berkayjam",
      members: ["berkayjam", "melodya", "kaanbeats", "zeynepsynth", "selinmix"],
    },
    {
      key: "jazz",
      name: "Kadikoy Jazz Lab",
      handle: "kadikoy_jazz_lab",
      description:
        "Standartlar, doğaçlama egzersizleri ve küçük sahne provaları.",
      themeColor: "blue",
      tags: ["Jazz", "Practice", "Acoustic"],
      owner: "dilanjazz",
      members: ["dilanjazz", "efe_groove", "mertbass", "melodya"],
    },
    {
      key: "electronic",
      name: "Modular Nights",
      handle: "modular_nights",
      description:
        "Synth patch paylaşımı, ambient texture ve elektronik canlı set denemeleri.",
      themeColor: "purple",
      tags: ["Electronic", "Ambient", "House"],
      owner: "zeynepsynth",
      members: ["zeynepsynth", "kaanbeats", "selinmix", "berkayjam"],
    },
    {
      key: "rock",
      name: "Garage Rock TR",
      handle: "garage_rock_tr",
      description:
        "Gitar tonları, davul düzenleri ve sahneye çıkacak yeni ekipler.",
      themeColor: "red",
      tags: ["Rock", "Beginner", "Collab"],
      owner: "mertbass",
      members: ["mertbass", "efe_groove", "melodya", "dilanjazz"],
    },
  ];

  const communityIds: Record<string, Id<"communities">> = {};

  for (const community of communities) {
    const existing = await ctx.db
      .query("communities")
      .withIndex("by_handle", (q) => q.eq("handle", community.handle))
      .first();
    if (existing) {
      communityIds[community.key] = existing._id;
      continue;
    }

    const communityId = await ctx.db.insert("communities", {
      name: community.name,
      handle: community.handle,
      description: community.description,
      avatarUrl: avatar(community.handle),
      bannerUrl: banner,
      themeColor: community.themeColor,
      tags: community.tags,
      ownerId: ids[community.owner],
      membersCount: community.members.length,
      postsCount: 0,
      createdAt: createdAt - Object.keys(communityIds).length * 86_400_000,
    });
    communityIds[community.key] = communityId;
    await insertUniqueLock(ctx, "community_handle", community.handle, communityId);

    for (const [memberIndex, member] of community.members.entries()) {
      await ctx.db.insert("community_members", {
        communityId,
        profileId: ids[member],
        role:
          member === community.owner
            ? "owner"
            : member === community.members[1]
              ? "mod"
              : "member",
        joinedAt: createdAt - memberIndex * 86_400_000,
      });
    }

    await ctx.db.insert("jam_servers", {
      kind: "community",
      communityId,
      status: "enabled",
      serverId: `community-${community.handle}`,
      name: `${community.name} Server`,
      host: "127.0.0.1",
      port: 9999,
      joinSecret: "demo-community-secret",
      priority: 1,
      region: "Istanbul",
      createdAt,
      updatedAt: createdAt,
    });
  }

  return communityIds;
}

async function seedPosts(
  ctx: MutationCtx,
  ids: Record<string, Id<"profiles">>,
  communities: Record<string, Id<"communities">>
) {
  const posts = [
    {
      author: "melodya",
      text: "Yeni hook taslağı hazır. Nakaratta daha geniş vokal armonisi mi, yoksa tek sesli daha samimi bir kayıt mı?",
      audioTitle: "Velvet Hook Draft",
      audioDuration: 74,
      community: "lofi",
      likes: 18,
    },
    {
      author: "berkayjam",
      text: "Bu gece 22:30'da lo-fi jam odasını açıyorum. 85 BPM civarı chill gitar ve soft pad üstüne fikir atalım.",
      audioTitle: "Night Bus Loop",
      audioDuration: 61,
      community: "lofi",
      likes: 24,
    },
    {
      author: "kaanbeats",
      text: "Kick çok önde mi? Kulaklıkta güzel, monitörde biraz fazla agresif gibi geldi.",
      audioTitle: "Pocket Test 03",
      audioDuration: 49,
      likes: 15,
    },
    {
      author: "dilanjazz",
      text: "Autumn Leaves köprüsüne reharmonize denedim. Saksafon cevabı için boşluk bıraktım.",
      audioTitle: "Bridge Reharm Sketch",
      audioDuration: 82,
      community: "jazz",
      likes: 21,
    },
    {
      author: "zeynepsynth",
      text: "Granular pad zincirim: field recording -> shimmer -> tape delay. Ambient topluluğu için preset notlarını bırakıyorum.",
      audioTitle: "Rain Tape Pad",
      audioDuration: 96,
      community: "electronic",
      likes: 30,
    },
    {
      author: "efe_groove",
      text: "7/8 groove fikri. Bass girecek biri varsa ikinci bölümde yürüyüşe yer bıraktım.",
      audioTitle: "Odd Pocket",
      audioDuration: 55,
      community: "jazz",
      likes: 12,
    },
    {
      author: "mertbass",
      text: "Garage Rock TR için demo riff. Vokal daha punk mı kalsın, indie pop'a mı çekelim?",
      audioTitle: "Basement Riff",
      audioDuration: 68,
      community: "rock",
      likes: 17,
    },
    {
      author: "selinmix",
      text: "Mix notu: vokali 2 dB öne aldım, sidechain release'i kısalttım. Low-end artık daha kontrollü.",
      audioTitle: "Mix A/B Clip",
      audioDuration: 43,
      likes: 19,
    },
  ];

  const postIds: Id<"posts">[] = [];
  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const postId = await ctx.db.insert("posts", {
      authorId: ids[post.author],
      text: post.text,
      audioUrl: audio((i % 4) + 1),
      audioTitle: post.audioTitle,
      audioDuration: post.audioDuration,
      communityId: post.community ? communities[post.community] : undefined,
      likesCount: post.likes,
      commentsCount: 0,
      nextCommentSequence: 0,
    });
    postIds.push(postId);

    if (post.community) {
      const community = await ctx.db.get(communities[post.community]);
      if (community) {
        await ctx.db.patch(community._id, {
          postsCount: community.postsCount + 1,
        });
      }
    }
  }
  return postIds;
}

async function seedComments(
  ctx: MutationCtx,
  ids: Record<string, Id<"profiles">>,
  postIds: Id<"posts">[]
) {
  const commentIds: Id<"comments">[] = [];
  const comments = [
    ["berkayjam", 0, "Tek ses başla, ikinci nakaratta harmony stack açılırsa video için de iyi yükselir."],
    ["selinmix", 0, "Sibilance temiz, sadece 8k civarı parlaklığı azıcık törpülerdim."],
    ["melodya", 1, "Ben vokal ad-lib ile gelirim. 22:30 uygun."],
    ["kaanbeats", 1, "808 yerine warm bass patch deneyeyim mi?"],
    ["efe_groove", 2, "Kick transient güzel ama decay biraz kısa olabilir."],
    ["mertbass", 3, "Köprüde walking bass ile cevap verebilirim."],
    ["dilanjazz", 4, "Pad çok sinematik. Üstüne nefesli drone yakışır."],
    ["berkayjam", 5, "7/8 ikinci turda çok akıyor, clap'i daha geriye atınca daha doğal."],
    ["efe_groove", 6, "Punk enerji iyi, vokalde biraz call-response deneyelim."],
    ["kaanbeats", 7, "Low-end daha net olmuş. A/B farkı telefonda da belli."],
  ] as const;

  const perPostCount = new Map<string, number>();
  for (const [author, postIndex, text] of comments) {
    const postId = postIds[postIndex];
    const next = (perPostCount.get(postId) ?? 0) + 1;
    perPostCount.set(postId, next);
    const commentId = await ctx.db.insert("comments", {
      postId,
      authorId: ids[author],
      path: String(next).padStart(4, "0"),
      depth: 0,
      text,
      likesCount: next + 2,
      repliesCount: next % 2,
      nextReplySequence: next % 2,
    });
    commentIds.push(commentId);

    const post = await ctx.db.get(postId);
    if (post) {
      await ctx.db.patch(postId, {
        commentsCount: (post.commentsCount ?? 0) + 1,
        nextCommentSequence: Math.max(post.nextCommentSequence ?? 0, next),
      });
    }

    if (next % 2 === 1) {
      const replyId = await ctx.db.insert("comments", {
        postId,
        authorId: ids[author === "berkayjam" ? "melodya" : "berkayjam"],
        parentId: commentId,
        path: `${String(next).padStart(4, "0")}.0001`,
        depth: 1,
        text: "Aynen, bunu jam odasında canlı denersek karar çok hızlı çıkar.",
        likesCount: 2,
        repliesCount: 0,
        nextReplySequence: 0,
      });
      commentIds.push(replyId);
      const post = await ctx.db.get(postId);
      if (post) {
        await ctx.db.patch(postId, {
          commentsCount: (post.commentsCount ?? 0) + 1,
        });
      }
    }
  }
  return commentIds;
}

async function seedLikes(
  ctx: MutationCtx,
  ids: Record<string, Id<"profiles">>,
  postIds: Id<"posts">[],
  commentIds: Id<"comments">[]
) {
  const users = Object.values(ids);
  for (let i = 0; i < postIds.length; i++) {
    for (let j = 0; j < users.length; j++) {
      if ((i + j) % 3 !== 0) continue;
      await ctx.db.insert("post_likes", { postId: postIds[i], userId: users[j] });
      await insertUniqueLock(ctx, "post_like", `${postIds[i]}:${users[j]}`, users[j]);
    }
  }

  for (let i = 0; i < commentIds.length; i++) {
    for (let j = 0; j < users.length; j++) {
      if ((i + j) % 4 !== 0) continue;
      await ctx.db.insert("comment_likes", {
        commentId: commentIds[i],
        userId: users[j],
      });
      await insertUniqueLock(
        ctx,
        "comment_like",
        `${commentIds[i]}:${users[j]}`,
        users[j]
      );
    }
  }
}

async function seedRooms(
  ctx: MutationCtx,
  ids: Record<string, Id<"profiles">>,
  communities: Record<string, Id<"communities">>,
  officialServerId: Id<"jam_servers">,
  createdAt: number
) {
  const rooms = [
    {
      host: "berkayjam",
      handle: "nightbus",
      name: "Night Bus Lo-Fi Jam",
      description: "Soft guitars, dusty keys, 85 BPM. Dinleyen herkes fikir atabilir.",
      genre: "Lo-Fi",
      community: "lofi",
      access: "anyone" as const,
      status: "live" as const,
    },
    {
      host: "dilanjazz",
      handle: "bluebridge",
      name: "Blue Bridge Standards",
      description: "Jazz standards, reharm denemeleri ve sakin solo paslaşmaları.",
      genre: "Jazz",
      community: "jazz",
      access: "approved" as const,
      status: "live" as const,
    },
    {
      host: "zeynepsynth",
      handle: "modularcloud",
      name: "Modular Cloud Session",
      description: "Ambient patch paylaşımı ve canlı drone layer kayıtları.",
      genre: "Ambient",
      community: "electronic",
      access: "anyone" as const,
      status: "live" as const,
    },
    {
      host: "efe_groove",
      handle: "drumcellar",
      name: "Drum Cellar Practice",
      description: "Davul warm-up, odd meter ve bas gitar için boş kanallar.",
      genre: "Rock",
      access: "friends" as const,
      status: "idle" as const,
    },
  ];

  for (let i = 0; i < rooms.length; i++) {
    const room = rooms[i];
    const roomId = await ctx.db.insert("rooms", {
      hostId: ids[room.host],
      handle: room.handle,
      name: room.name,
      description: room.description,
      genre: room.genre,
      maxPerformers: 6,
      isPrivate: room.access !== "anyone",
      visibility: "public",
      listenAccess: room.access === "friends" ? "friends" : room.access,
      jamAccess: room.access === "approved" ? "approved" : room.access,
      isActive: true,
      streamUrl:
        room.status === "live"
          ? "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
          : undefined,
      status: room.status,
      listenerStatus: room.status === "live" ? "live" : "off",
      communityId: room.community ? communities[room.community] : undefined,
      scopeKey: room.community ? `community:${communities[room.community]}` : "global",
      lastActiveAt: createdAt - i * 12 * 60_000,
    });
    await insertUniqueLock(ctx, "room_handle", room.handle, roomId);

    await ctx.db.insert("jam_sessions", {
      roomId,
      jamServerId: officialServerId,
      serverId: "jam-demo-eu-1",
      status: room.status === "live" ? "active" : "expired",
      startedAt: createdAt - 30 * 60_000,
      lastJoinAt: createdAt - 2 * 60_000,
      lastRefreshAt: createdAt - 60_000,
      expiresAt: createdAt + 5 * 60_000,
    });

    for (const [sender, text] of [
      [room.host, "Hoş geldiniz, ilk loop'u birazdan döndürüyorum."],
      ["melodya", "Kulaklıkta net geliyor, vokal denemesi için hazırım."],
      ["kaanbeats", "BPM sabit mi kalsın? Kick pattern ekleyebilirim."],
    ] as const) {
      await ctx.db.insert("room_messages", {
        roomId,
        senderId: ids[sender],
        text,
      });
    }

    if (room.access === "approved") {
      await ctx.db.insert("room_access_requests", {
        roomId,
        requesterId: ids.kaanbeats,
        type: "jam",
        status: "pending",
        updatedAt: createdAt - 3 * 60_000,
      });
      await ctx.db.insert("room_access_grants", {
        roomId,
        profileId: ids.mertbass,
        type: "listen",
        grantedBy: ids[room.host],
        grantedAt: createdAt - 20 * 60_000,
      });
    }
  }
}

async function seedFriendships(
  ctx: MutationCtx,
  ids: Record<string, Id<"profiles">>
) {
  const accepted = [
    ["berkayjam", "melodya"],
    ["berkayjam", "kaanbeats"],
    ["berkayjam", "zeynepsynth"],
    ["melodya", "dilanjazz"],
    ["efe_groove", "mertbass"],
    ["selinmix", "kaanbeats"],
  ] as const;

  for (const [a, b] of accepted) {
    await ctx.db.insert("friends", {
      userId: ids[a],
      friendId: ids[b],
      status: "accepted",
    });
    await ctx.db.insert("friends", {
      userId: ids[b],
      friendId: ids[a],
      status: "accepted",
    });
  }

  await ctx.db.insert("friends", {
    userId: ids.efe_groove,
    friendId: ids.berkayjam,
    status: "pending",
  });
  await ctx.db.insert("friends", {
    userId: ids.berkayjam,
    friendId: ids.selinmix,
    status: "pending",
  });
  await ctx.db.insert("blocks", {
    blockerId: ids.dilanjazz,
    blockedId: ids.kaanbeats,
  });
}

async function seedConversations(
  ctx: MutationCtx,
  ids: Record<string, Id<"profiles">>,
  createdAt: number
) {
  const pairs = [
    {
      a: "berkayjam",
      b: "melodya",
      messages: [
        ["melodya", "Nakarat fikrini attım, ikinci yarıda harmony açıyorum."],
        ["berkayjam", "Süper. Intro gitarını sade tutup vokale alan bırakıyorum."],
        ["melodya", "Video çekiminde bu konuşma kısmı güzel görünecek."],
      ],
    },
    {
      a: "berkayjam",
      b: "kaanbeats",
      messages: [
        ["kaanbeats", "Beat pack içinden 03 numara demo için en neti."],
        ["berkayjam", "Katılıyorum. Jam odasında onu açalım."],
      ],
    },
    {
      a: "berkayjam",
      b: "zeynepsynth",
      messages: [
        ["zeynepsynth", "Modular Cloud odasına bir pad layer gönderdim."],
        ["berkayjam", "Çok iyi, feed postunda da paylaşalım."],
      ],
    },
  ] as const;

  for (const pair of pairs) {
    const conversationId = await ctx.db.insert("conversations", {
      isGroup: false,
    });
    const dmKey =
      ids[pair.a] < ids[pair.b]
        ? `${ids[pair.a]}:${ids[pair.b]}`
        : `${ids[pair.b]}:${ids[pair.a]}`;
    await ctx.db.insert("dm_keys", { dmKey, conversationId });
    await insertUniqueLock(ctx, "dm_pair", dmKey, conversationId);

    const participantA = await ctx.db.insert("conversation_participants", {
      conversationId,
      profileId: ids[pair.a],
      joinedAt: createdAt - 2 * 86_400_000,
      isActive: true,
      lastActivityAt: createdAt,
    });
    const participantB = await ctx.db.insert("conversation_participants", {
      conversationId,
      profileId: ids[pair.b],
      joinedAt: createdAt - 2 * 86_400_000,
      isActive: true,
      lastActivityAt: createdAt,
    });

    let lastMessageId: Id<"messages"> | null = null;
    let lastSenderId: Id<"profiles"> | null = null;
    let lastText = "";
    let lastCreatedAt = createdAt;

    for (const [index, [sender, text]] of pair.messages.entries()) {
      const messageId = await ctx.db.insert("messages", {
        conversationId,
        senderId: ids[sender],
        text,
      });
      const message = await ctx.db.get(messageId);
      lastMessageId = messageId;
      lastSenderId = ids[sender];
      lastText = text;
      lastCreatedAt = message?._creationTime ?? createdAt + index;
    }

    await ctx.db.patch(conversationId, {
      lastMessageAt: lastCreatedAt,
      lastMessageId: lastMessageId ?? undefined,
      lastMessageSenderId: lastSenderId ?? undefined,
      lastMessageText: lastText,
      lastMessageCreatedAt: lastCreatedAt,
    });
    await ctx.db.patch(participantA, {
      lastActivityAt: lastCreatedAt,
      lastReadMessageAt: pair.a === "berkayjam" ? lastCreatedAt - 1 : lastCreatedAt,
    });
    await ctx.db.patch(participantB, {
      lastActivityAt: lastCreatedAt,
      lastReadMessageAt: pair.b === "melodya" ? lastCreatedAt : lastCreatedAt - 1,
    });
  }
}

async function seedBands(
  ctx: MutationCtx,
  ids: Record<string, Id<"profiles">>,
  createdAt: number
) {
  const listings = [
    {
      owner: "mertbass",
      bandName: "Basement Satellites",
      currentMembers: 3,
      maxMembers: 5,
      seekingRole: "Vocalist",
      region: "Istanbul / Kadikoy",
      genre: "Indie Rock",
      description:
        "Haftada bir prova, Türkçe/İngilizce indie rock. Enerjik ama melodik vokal arıyoruz.",
      applicants: ["melodya", "dilanjazz"],
    },
    {
      owner: "dilanjazz",
      bandName: "Blue Ferry Quartet",
      currentMembers: 2,
      maxMembers: 4,
      seekingRole: "Bassist",
      region: "Istanbul / Besiktas",
      genre: "Jazz",
      description:
        "Standartlar ve özgün besteler. Upright veya fretless bas öncelikli.",
      applicants: ["mertbass", "efe_groove"],
    },
    {
      owner: "kaanbeats",
      bandName: "Sample Society",
      currentMembers: 2,
      maxMembers: 6,
      seekingRole: "Producer",
      region: "Remote",
      genre: "Hip Hop",
      description:
        "Sample tabanlı beat kolektifi. Haftalık beat challenge ve feedback oturumu.",
      applicants: ["berkayjam", "selinmix"],
    },
    {
      owner: "zeynepsynth",
      bandName: "Tape Garden",
      currentMembers: 1,
      maxMembers: 3,
      seekingRole: "Keyboardist",
      region: "Izmir",
      genre: "Ambient",
      description:
        "Canlı ambient performans için keys/pad layer ve field recording ilgisi olan ekip arkadaşı.",
      applicants: ["melodya"],
    },
  ];

  for (const [index, listing] of listings.entries()) {
    const listingId = await ctx.db.insert("band_listings", {
      ownerId: ids[listing.owner],
      bandName: listing.bandName,
      currentMembers: listing.currentMembers,
      maxMembers: listing.maxMembers,
      seekingRole: listing.seekingRole,
      region: listing.region,
      regionNormalized: listing.region.trim().toLowerCase(),
      description: listing.description,
      genre: listing.genre,
      status: "open",
      applicationsCount: listing.applicants.length,
      createdAt: createdAt - index * 3_600_000,
    });

    for (const [appIndex, applicant] of listing.applicants.entries()) {
      const accepted = appIndex === 0 && index % 2 === 1;
      await ctx.db.insert("band_applications", {
        listingId,
        applicantId: ids[applicant],
        instrument:
          applicant === "melodya"
            ? "Vocals"
            : applicant === "mertbass"
              ? "Bass"
              : applicant === "selinmix"
                ? "Mix / Producer"
                : "Guitar",
        experience:
          "Canli prova ve uzaktan kayıt akışına alışığım. Referans kayıtları profilimde mevcut.",
        message:
          "Demo parçayı dinledim, özellikle ikinci bölümde katılabileceğim alanlar var.",
        status: accepted ? "accepted" : "pending",
        createdAt: createdAt - (index + appIndex + 1) * 30 * 60_000,
        respondedAt: accepted ? createdAt - 20 * 60_000 : undefined,
        reviewedAt: accepted ? createdAt - 20 * 60_000 : undefined,
      });
    }
  }
}

async function seedTracks(
  ctx: MutationCtx,
  ids: Record<string, Id<"profiles">>,
  createdAt: number
) {
  const tracks = [
    ["berkayjam", "Night Bus Loop", 128, 4_200_000, 1],
    ["berkayjam", "Soft Pad Verse", 96, 3_600_000, 2],
    ["berkayjam", "Indie Guitar Memo", 72, 2_900_000, 3],
    ["melodya", "Velvet Hook Main", 84, 3_100_000, 4],
    ["kaanbeats", "Pocket Test 03", 109, 4_900_000, 5],
    ["zeynepsynth", "Rain Tape Pad", 144, 5_400_000, 6],
  ] as const;

  for (const [owner, title, duration, fileSize, song] of tracks) {
    await ctx.db.insert("my_tracks", {
      ownerId: ids[owner],
      title,
      audioUrl: audio(song),
      duration,
      fileSize,
      contentType: "audio/mpeg",
      createdAt: createdAt - song * 600_000,
    });
  }
}

async function seedReports(
  ctx: MutationCtx,
  ids: Record<string, Id<"profiles">>,
  postIds: Id<"posts">[],
  communities: Record<string, Id<"communities">>,
  createdAt: number
) {
  await ctx.db.insert("reports", {
    reporterId: ids.selinmix,
    reportedUserId: ids.efe_groove,
    targetType: "post",
    targetId: String(postIds[5]),
    reason: "other",
    details: "Demo moderation queue item for review workflow.",
    status: "reviewing",
    createdAt: createdAt - 2 * 60 * 60_000,
    updatedAt: createdAt - 30 * 60_000,
  });

  await ctx.db.insert("reports", {
    reporterId: ids.dilanjazz,
    targetType: "community",
    targetId: String(communities.rock),
    reason: "spam",
    details: "Demo report with resolved state.",
    status: "resolved",
    createdAt: createdAt - 4 * 60 * 60_000,
    updatedAt: createdAt - 3 * 60 * 60_000,
  });
}

async function resetDemoRows(ctx: MutationCtx) {
  const tableNames = [
    "reports",
    "my_tracks",
    "band_applications",
    "band_listings",
    "messages",
    "conversation_participants",
    "dm_keys",
    "conversations",
    "room_messages",
    "listener_publish_sessions",
    "jam_sessions",
    "room_access_grants",
    "room_access_requests",
    "rooms",
    "jam_servers",
    "blocks",
    "friends",
    "comment_likes",
    "post_likes",
    "comments",
    "posts",
    "community_members",
    "communities",
    "upload_sessions",
    "unique_locks",
    "profiles",
  ] as const;

  for (const table of tableNames) {
    let keepGoing = true;
    while (keepGoing) {
      const rows = await ctx.db.query(table).take(100);
      keepGoing = rows.length > 0;
      for (const row of rows) {
        await ctx.db.delete(row._id);
      }
    }
  }
}
