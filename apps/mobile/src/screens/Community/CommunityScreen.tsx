import React, { useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  useCommunities,
  useCreateCommunity,
  useCommunityCreatedCount,
  useJoinCommunity,
  useLeaveCommunity,
} from "@/hooks/useCommunities";
import type { CommunityListItem } from "@/types";

const COMMUNITY_TAGS = [
  "LoFi",
  "Rock",
  "Metal",
  "Electronic",
  "Jazz",
  "Hip Hop",
  "Indie",
  "Classical",
  "R&B",
  "Reggae",
  "Ambient",
  "House",
  "Pop",
  "Acoustic",
  "Beginner",
  "Collab",
  "Practice",
  "Late Night",
];

const THEME_COLORS = [
  "amber",
  "blue",
  "green",
  "teal",
  "cyan",
  "red",
  "pink",
  "indigo",
  "purple",
  "orange",
];

const THEME_COLOR_VALUES: Record<string, string> = {
  amber: "#D8A64A",
  blue: "#5D9CEC",
  green: "#4FB477",
  teal: "#35B7A5",
  cyan: "#41BBD9",
  red: "#EF6F6C",
  pink: "#E879B9",
  indigo: "#7C8CF8",
  purple: "#A97CF8",
  orange: "#E89A55",
};

export default function CommunityScreen() {
  const navigation = useNavigation<any>();
  const createCommunity = useCreateCommunity();
  const joinCommunity = useJoinCommunity();
  const leaveCommunity = useLeaveCommunity();
  const createdCount = useCommunityCreatedCount();
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | undefined>();
  const {
    data: communities,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useCommunities({
    search,
    tag: selectedTag,
  });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [description, setDescription] = useState("");
  const [themeColor, setThemeColor] = useState("amber");
  const [selectedTags, setSelectedTags] = useState<string[]>(["Collab"]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingCommunityId, setPendingCommunityId] = useState<string | null>(null);

  const normalizedHandle = useMemo(
    () => normalizeHandle(handle || name),
    [handle, name]
  );
  const canCreate =
    name.trim().length >= 2 &&
    normalizedHandle.length >= 2 &&
    selectedTags.length > 0 &&
    !isSubmitting;

  const toggleCreateTag = (tag: string) => {
    setError(null);
    setSelectedTags((current) => {
      if (current.includes(tag)) {
        return current.filter((item) => item !== tag);
      }
      if (current.length >= 5) {
        setError("Choose up to 5 tags.");
        return current;
      }
      return [...current, tag];
    });
  };

  const handleCreate = async () => {
    if (!canCreate) return;

    try {
      setError(null);
      setIsSubmitting(true);
      await createCommunity.mutateAsync({
        description: description.trim() || undefined,
        handle: normalizedHandle,
        name: name.trim(),
        tags: selectedTags,
        themeColor,
      });
      setName("");
      setHandle("");
      setDescription("");
      setThemeColor("amber");
      setSelectedTags(["Collab"]);
      setIsCreateOpen(false);
    } catch (err) {
      setError(getCommunityErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMembershipPress = async (community: CommunityListItem) => {
    if (pendingCommunityId) return;

    try {
      setError(null);
      setPendingCommunityId(community.id);
      if (community.member_role) {
        await leaveCommunity.mutateAsync(community.id);
      } else {
        await joinCommunity.mutateAsync(community.id);
      }
    } catch (err) {
      setError(getCommunityErrorMessage(err));
    } finally {
      setPendingCommunityId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        contentContainerStyle={[
          styles.content,
          communities.length === 0 ? styles.emptyContent : null,
        ]}
        data={communities}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {isLoading ? (
              <>
                <ActivityIndicator color="#D8A64A" />
                <Text style={styles.stateText}>Loading communities...</Text>
              </>
            ) : (
              <>
                <Ionicons color="#8F98A8" name="people-outline" size={32} />
                <Text style={styles.emptyTitle}>No communities found</Text>
                <Text style={styles.stateText}>Try another search or create one.</Text>
              </>
            )}
          </View>
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator color="#D8A64A" style={styles.footerLoader} />
          ) : null
        }
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
                <Ionicons color="#EEF0F5" name="chevron-back" size={22} />
              </Pressable>
              <View style={styles.headerText}>
                <Text style={styles.headerEyebrow}>Spaces</Text>
                <Text style={styles.headerTitle}>Communities</Text>
              </View>
            </View>

            <View style={styles.searchPanel}>
              <View style={styles.searchBox}>
                <Ionicons color="#8F98A8" name="search" size={17} />
                <TextInput
                  onChangeText={setSearch}
                  placeholder="Search communities"
                  placeholderTextColor="#7E8796"
                  style={styles.searchInput}
                  value={search}
                />
                {search ? (
                  <Pressable onPress={() => setSearch("")} style={styles.clearButton}>
                    <Ionicons color="#8F98A8" name="close" size={16} />
                  </Pressable>
                ) : null}
              </View>

              <FlatList
                contentContainerStyle={styles.filterList}
                data={["All", ...COMMUNITY_TAGS]}
                horizontal
                keyExtractor={(item) => item}
                renderItem={({ item }) => {
                  const isAll = item === "All";
                  const isSelected = isAll ? !selectedTag : selectedTag === item;
                  return (
                    <Pressable
                      onPress={() => setSelectedTag(isAll ? undefined : item)}
                      style={[
                        styles.filterChip,
                        isSelected ? styles.filterChipActive : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          isSelected ? styles.filterChipTextActive : null,
                        ]}
                      >
                        {item}
                      </Text>
                    </Pressable>
                  );
                }}
                showsHorizontalScrollIndicator={false}
              />
            </View>

            <View style={styles.createPanel}>
              <Pressable
                onPress={() => {
                  setError(null);
                  setIsCreateOpen((value) => !value);
                }}
                style={styles.createPanelHeader}
              >
                <View style={styles.createIcon}>
                  <Ionicons color="#D8A64A" name="add" size={20} />
                </View>
                <View style={styles.createHeaderText}>
                  <Text style={styles.createTitle}>Create community</Text>
                  <Text style={styles.createSubtitle}>{createdCount}/3 owned communities</Text>
                </View>
                <Ionicons
                  color="#8F98A8"
                  name={isCreateOpen ? "chevron-up" : "chevron-down"}
                  size={20}
                />
              </Pressable>

              {isCreateOpen ? (
                <View style={styles.form}>
                  <TextInput
                    maxLength={50}
                    onChangeText={(value) => {
                      setName(value);
                      setError(null);
                    }}
                    placeholder="Community name"
                    placeholderTextColor="#7E8796"
                    style={styles.input}
                    value={name}
                  />
                  <TextInput
                    autoCapitalize="none"
                    maxLength={30}
                    onChangeText={(value) => {
                      setHandle(value);
                      setError(null);
                    }}
                    placeholder="community-handle"
                    placeholderTextColor="#7E8796"
                    style={styles.input}
                    value={handle}
                  />
                  <Text style={styles.handlePreview}>#{normalizedHandle || "handle"}</Text>
                  <TextInput
                    maxLength={500}
                    multiline
                    onChangeText={(value) => {
                      setDescription(value);
                      setError(null);
                    }}
                    placeholder="What is this community about?"
                    placeholderTextColor="#7E8796"
                    style={[styles.input, styles.descriptionInput]}
                    textAlignVertical="top"
                    value={description}
                  />

                  <Text style={styles.formLabel}>Theme</Text>
                  <View style={styles.themeGrid}>
                    {THEME_COLORS.map((color) => {
                      const isSelected = themeColor === color;
                      return (
                        <Pressable
                          key={color}
                          onPress={() => setThemeColor(color)}
                          style={[
                            styles.themeButton,
                            {
                              borderColor: isSelected
                                ? THEME_COLOR_VALUES[color]
                                : "rgba(255,255,255,0.1)",
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.themeSwatch,
                              { backgroundColor: THEME_COLOR_VALUES[color] },
                            ]}
                          />
                          <Text style={styles.themeText}>{color}</Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Text style={styles.formLabel}>Tags</Text>
                  <View style={styles.tagGrid}>
                    {COMMUNITY_TAGS.map((tag) => {
                      const isSelected = selectedTags.includes(tag);
                      return (
                        <Pressable
                          key={tag}
                          onPress={() => toggleCreateTag(tag)}
                          style={[
                            styles.tagChip,
                            isSelected ? styles.tagChipActive : null,
                          ]}
                        >
                          <Text
                            style={[
                              styles.tagChipText,
                              isSelected ? styles.tagChipTextActive : null,
                            ]}
                          >
                            {tag}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {error ? <Text style={styles.error}>{error}</Text> : null}

                  <Pressable
                    disabled={!canCreate}
                    onPress={handleCreate}
                    style={({ pressed }) => [
                      styles.createButton,
                      !canCreate ? styles.createButtonDisabled : null,
                      pressed && canCreate ? styles.createButtonPressed : null,
                    ]}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="#251B0A" />
                    ) : (
                      <Text style={styles.createButtonText}>Create Community</Text>
                    )}
                  </Pressable>
                </View>
              ) : error ? (
                <Text style={styles.error}>{error}</Text>
              ) : null}
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Discover</Text>
              <Text style={styles.sectionMeta}>{communities.length} shown</Text>
            </View>
          </>
        }
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        renderItem={({ item }) => (
          <CommunityRow
            community={item}
            isPending={pendingCommunityId === item.id}
            onMembershipPress={() => handleMembershipPress(item)}
            onOpen={() => navigation.navigate("CommunityDetail", { handle: item.handle })}
          />
        )}
      />
    </SafeAreaView>
  );
}

function CommunityRow({
  community,
  isPending,
  onMembershipPress,
  onOpen,
}: {
  community: CommunityListItem;
  isPending: boolean;
  onMembershipPress: () => void;
  onOpen: () => void;
}) {
  const accent = THEME_COLOR_VALUES[community.theme_color] ?? THEME_COLOR_VALUES.amber;
  const membershipLabel =
    community.member_role === "owner"
      ? "Owner"
      : community.member_role
        ? "Joined"
        : "Join";
  const canLeave = community.member_role && community.member_role !== "owner";

  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => [
        styles.communityRow,
        pressed ? styles.communityRowPressed : null,
      ]}
    >
      <View style={styles.communityTop}>
        <View style={[styles.communityAvatar, { backgroundColor: `${accent}22` }]}>
          <Text style={[styles.communityAvatarText, { color: accent }]}>
            {community.name.slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <View style={styles.communityBody}>
          <View style={styles.communityNameRow}>
            <Text numberOfLines={1} style={styles.communityName}>
              {community.name}
            </Text>
            <Text style={styles.communityHandle}>#{community.handle}</Text>
          </View>
          <Text style={styles.communityStats}>
            {community.members_count} members - {community.posts_count} posts
          </Text>
        </View>
      </View>

      {community.description ? (
        <Text numberOfLines={3} style={styles.communityDescription}>
          {community.description}
        </Text>
      ) : null}

      <View style={styles.communityFooter}>
        <View style={styles.communityTags}>
          {community.tags.slice(0, 3).map((tag) => (
            <View key={tag} style={styles.communityTag}>
              <Text style={styles.communityTagText}>{tag}</Text>
            </View>
          ))}
        </View>
        <Pressable
          disabled={isPending || community.member_role === "owner"}
          onPress={(event) => {
            event.stopPropagation();
            onMembershipPress();
          }}
          style={[
            styles.membershipButton,
            community.member_role ? styles.membershipButtonJoined : null,
            canLeave ? styles.membershipButtonLeave : null,
            community.member_role === "owner" ? styles.membershipButtonLocked : null,
          ]}
        >
          {isPending ? (
            <ActivityIndicator
              color={community.member_role ? "#D5D9E2" : "#251B0A"}
              size="small"
            />
          ) : (
            <Text
              style={[
                styles.membershipButtonText,
                community.member_role ? styles.membershipButtonTextJoined : null,
              ]}
            >
              {canLeave ? "Leave" : membershipLabel}
            </Text>
          )}
        </Pressable>
      </View>
    </Pressable>
  );
}

function normalizeHandle(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "")
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "")
    .slice(0, 30);
}

function getCommunityErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("COMMUNITY_LIMIT_REACHED")) {
    return "You can own at most 3 communities.";
  }
  if (message.includes("HANDLE_TAKEN")) {
    return "That handle is already in use.";
  }
  if (message.includes("HANDLE_REQUIRED")) {
    return "Community handle is required.";
  }
  if (message.includes("HANDLE_TOO_SHORT")) {
    return "Handle must be at least 2 characters.";
  }
  if (message.includes("HANDLE_INVALID")) {
    return "Handle can use letters, numbers, hyphens, and underscores.";
  }
  if (message.includes("COMMUNITY_NAME_TOO_SHORT")) {
    return "Community name must be at least 2 characters.";
  }
  if (message.includes("TAG_LIMIT")) {
    return "Choose up to 5 tags.";
  }
  if (message.includes("ALREADY_MEMBER")) {
    return "You are already a member.";
  }
  if (message.includes("OWNER_CANNOT_LEAVE")) {
    return "Owners cannot leave their own community.";
  }
  if (message.includes("Rate limit")) {
    return "Slow down for a moment before trying again.";
  }

  return message || "Something went wrong. Please try again.";
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#1A1E29",
    flex: 1,
  },
  content: {
    paddingBottom: 22,
  },
  emptyContent: {
    flexGrow: 1,
  },
  header: {
    alignItems: "center",
    borderBottomColor: "rgba(255,255,255,0.08)",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  backButton: {
    alignItems: "center",
    borderRadius: 8,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  headerEyebrow: {
    color: "#8F98A8",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  headerTitle: {
    color: "#EEF0F5",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0,
    marginTop: 2,
  },
  searchPanel: {
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  searchBox: {
    alignItems: "center",
    backgroundColor: "#262B37",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  searchInput: {
    color: "#EEF0F5",
    flex: 1,
    fontSize: 15,
    minWidth: 0,
  },
  clearButton: {
    alignItems: "center",
    borderRadius: 8,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  filterList: {
    gap: 8,
    paddingTop: 12,
  },
  filterChip: {
    backgroundColor: "#262B37",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChipActive: {
    backgroundColor: "rgba(216,166,74,0.14)",
    borderColor: "rgba(216,166,74,0.42)",
  },
  filterChipText: {
    color: "#8F98A8",
    fontSize: 12,
    fontWeight: "800",
  },
  filterChipTextActive: {
    color: "#D8A64A",
  },
  createPanel: {
    backgroundColor: "#262B37",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 14,
    marginTop: 14,
    padding: 14,
  },
  createPanelHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  createIcon: {
    alignItems: "center",
    backgroundColor: "rgba(216,166,74,0.12)",
    borderRadius: 8,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  createHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  createTitle: {
    color: "#EEF0F5",
    fontSize: 16,
    fontWeight: "900",
  },
  createSubtitle: {
    color: "#8F98A8",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  form: {
    marginTop: 12,
  },
  input: {
    backgroundColor: "#1E2330",
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    borderWidth: 1,
    color: "#EEF0F5",
    fontSize: 15,
    minHeight: 44,
    marginTop: 10,
    paddingHorizontal: 12,
  },
  descriptionInput: {
    lineHeight: 21,
    minHeight: 90,
    paddingVertical: 10,
  },
  handlePreview: {
    color: "#8F98A8",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 7,
  },
  formLabel: {
    color: "#D5D9E2",
    fontSize: 13,
    fontWeight: "900",
    marginTop: 14,
  },
  themeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 9,
  },
  themeButton: {
    alignItems: "center",
    backgroundColor: "#1E2330",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  themeSwatch: {
    borderRadius: 6,
    height: 14,
    width: 14,
  },
  themeText: {
    color: "#C7CCD6",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  tagGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 9,
  },
  tagChip: {
    backgroundColor: "#1E2330",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  tagChipActive: {
    backgroundColor: "rgba(216,166,74,0.14)",
    borderColor: "rgba(216,166,74,0.42)",
  },
  tagChipText: {
    color: "#8F98A8",
    fontSize: 12,
    fontWeight: "800",
  },
  tagChipTextActive: {
    color: "#D8A64A",
  },
  error: {
    backgroundColor: "rgba(127,29,29,0.5)",
    borderColor: "rgba(248,113,113,0.35)",
    borderRadius: 8,
    borderWidth: 1,
    color: "#FECACA",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  createButton: {
    alignItems: "center",
    backgroundColor: "#D8A64A",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 44,
    marginTop: 12,
  },
  createButtonDisabled: {
    backgroundColor: "#4B4F5D",
  },
  createButtonPressed: {
    opacity: 0.82,
  },
  createButtonText: {
    color: "#251B0A",
    fontSize: 14,
    fontWeight: "900",
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingBottom: 8,
    paddingTop: 18,
  },
  sectionTitle: {
    color: "#EEF0F5",
    fontSize: 16,
    fontWeight: "900",
  },
  sectionMeta: {
    color: "#8F98A8",
    fontSize: 12,
    fontWeight: "800",
  },
  communityRow: {
    borderBottomColor: "rgba(255,255,255,0.08)",
    borderBottomWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 15,
  },
  communityRowPressed: {
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  communityTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  communityAvatar: {
    alignItems: "center",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    borderWidth: 1,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  communityAvatarText: {
    fontSize: 13,
    fontWeight: "900",
  },
  communityBody: {
    flex: 1,
    minWidth: 0,
  },
  communityNameRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  communityName: {
    color: "#EEF0F5",
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "900",
  },
  communityHandle: {
    color: "#8F98A8",
    fontSize: 12,
    fontWeight: "800",
  },
  communityStats: {
    color: "#8F98A8",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  communityDescription: {
    color: "#C7CCD6",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  communityFooter: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    marginTop: 12,
  },
  communityTags: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    minWidth: 0,
  },
  communityTag: {
    backgroundColor: "#262B37",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  communityTagText: {
    color: "#8F98A8",
    fontSize: 11,
    fontWeight: "800",
  },
  membershipButton: {
    alignItems: "center",
    backgroundColor: "#D8A64A",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 34,
    minWidth: 76,
    paddingHorizontal: 12,
  },
  membershipButtonJoined: {
    backgroundColor: "#353B49",
  },
  membershipButtonLeave: {
    borderColor: "rgba(248,113,113,0.35)",
    borderWidth: 1,
  },
  membershipButtonLocked: {
    opacity: 0.72,
  },
  membershipButtonText: {
    color: "#251B0A",
    fontSize: 12,
    fontWeight: "900",
  },
  membershipButtonTextJoined: {
    color: "#D5D9E2",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 42,
  },
  emptyTitle: {
    color: "#EEF0F5",
    fontSize: 17,
    fontWeight: "900",
    marginTop: 10,
    textAlign: "center",
  },
  stateText: {
    color: "#8F98A8",
    marginTop: 10,
    textAlign: "center",
  },
  footerLoader: {
    marginVertical: 16,
  },
});
