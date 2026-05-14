import React, { useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
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
import { communityThemeColors } from "@/theme/communityThemeColors";
import { useMobileTheme } from "@/theme/MobileTheme";
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

export default function CommunityScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useMobileTheme();
  const insets = useSafeAreaInsets();
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 32 },
          communities.length === 0 ? styles.emptyContent : null,
        ]}
        data={communities}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {isLoading ? (
              <>
                <ActivityIndicator color={colors.primary} />
                <Text style={[styles.stateText, { color: colors.mutedForeground }]}>Loading communities...</Text>
              </>
            ) : (
              <>
                <Ionicons color={colors.mutedForeground} name="people-outline" size={32} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No communities found</Text>
                <Text style={[styles.stateText, { color: colors.mutedForeground }]}>Try another search or create one.</Text>
              </>
            )}
          </View>
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator color={colors.primary} style={styles.footerLoader} />
          ) : null
        }
        ListHeaderComponent={
          <>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <Pressable
                accessibilityLabel="Back"
                accessibilityRole="button"
                onPress={() => navigation.goBack()}
                style={styles.backButton}
              >
                <Ionicons color={colors.secondaryForeground} name="chevron-back" size={22} />
              </Pressable>
              <View style={styles.headerText}>
                <Text style={[styles.headerEyebrow, { color: colors.mutedForeground }]}>Spaces</Text>
                <Text style={[styles.headerTitle, { color: colors.foreground }]}>Communities</Text>
              </View>
            </View>

            <View style={styles.searchPanel}>
              <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons
                  accessibilityElementsHidden
                  color={colors.mutedForeground}
                  importantForAccessibility="no-hide-descendants"
                  name="search"
                  size={17}
                />
                <TextInput
                  onChangeText={setSearch}
                  placeholder="Search communities"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.searchInput, { color: colors.foreground }]}
                  value={search}
                />
                {search ? (
                  <Pressable
                    accessibilityLabel="Clear community search"
                    accessibilityRole="button"
                    onPress={() => setSearch("")}
                    style={styles.clearButton}
                  >
                    <Ionicons
                      accessibilityElementsHidden
                      color={colors.mutedForeground}
                      importantForAccessibility="no-hide-descendants"
                      name="close"
                      size={16}
                    />
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
                      accessibilityLabel={`Filter communities by ${item}`}
                      accessibilityRole="button"
                      onPress={() => setSelectedTag(isAll ? undefined : item)}
                      style={[
                        styles.filterChip,
                        {
                          backgroundColor: isSelected ? colors.accentMuted : colors.card,
                          borderColor: isSelected ? colors.ring : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          { color: isSelected ? colors.primary : colors.mutedForeground },
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

            <View style={[styles.createPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Pressable
                accessibilityLabel={`${isCreateOpen ? "Hide" : "Show"} create community form`}
                accessibilityRole="button"
                onPress={() => {
                  setError(null);
                  setIsCreateOpen((value) => !value);
                }}
                style={styles.createPanelHeader}
              >
                <View style={[styles.createIcon, { backgroundColor: colors.accentMuted }]}>
                  <Ionicons color={colors.primary} name="add" size={20} />
                </View>
                <View style={styles.createHeaderText}>
                  <Text style={[styles.createTitle, { color: colors.foreground }]}>Create community</Text>
                  <Text style={[styles.createSubtitle, { color: colors.mutedForeground }]}>{createdCount}/3 owned communities</Text>
                </View>
                <Ionicons
                  color={colors.mutedForeground}
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
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.input, { backgroundColor: colors.input, borderColor: colors.borderStrong, color: colors.foreground }]}
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
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.input, { backgroundColor: colors.input, borderColor: colors.borderStrong, color: colors.foreground }]}
                    value={handle}
                  />
                  <Text style={[styles.handlePreview, { color: colors.mutedForeground }]}>#{normalizedHandle || "handle"}</Text>
                  <TextInput
                    maxLength={500}
                    multiline
                    onChangeText={(value) => {
                      setDescription(value);
                      setError(null);
                    }}
                    placeholder="What is this community about?"
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.input, styles.descriptionInput, { backgroundColor: colors.input, borderColor: colors.borderStrong, color: colors.foreground }]}
                    textAlignVertical="top"
                    value={description}
                  />

                  <Text style={[styles.formLabel, { color: colors.secondaryForeground }]}>Theme</Text>
                  <View style={styles.themeGrid}>
                    {THEME_COLORS.map((color) => {
                      const isSelected = themeColor === color;
                      return (
                        <Pressable
                          accessibilityLabel={`Select ${color} theme`}
                          accessibilityRole="button"
                          key={color}
                          onPress={() => setThemeColor(color)}
                          style={[
                            styles.themeButton,
                            {
                              borderColor: isSelected
                                ? communityThemeColors[color]
                                : colors.border,
                              backgroundColor: colors.input,
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.themeSwatch,
                              { backgroundColor: communityThemeColors[color] },
                            ]}
                          />
                          <Text style={[styles.themeText, { color: colors.secondaryForeground }]}>{color}</Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Text style={[styles.formLabel, { color: colors.secondaryForeground }]}>Tags</Text>
                  <View style={styles.tagGrid}>
                    {COMMUNITY_TAGS.map((tag) => {
                      const isSelected = selectedTags.includes(tag);
                      return (
                        <Pressable
                          accessibilityLabel={`${isSelected ? "Remove" : "Add"} ${tag} tag`}
                          accessibilityRole="button"
                          key={tag}
                          onPress={() => toggleCreateTag(tag)}
                          style={[
                            styles.tagChip,
                            {
                              backgroundColor: isSelected ? colors.accentMuted : colors.input,
                              borderColor: isSelected ? colors.ring : colors.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                            styles.tagChipText,
                            { color: isSelected ? colors.primary : colors.mutedForeground },
                          ]}
                          >
                            {tag}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {error ? (
                    <Text style={[styles.error, { backgroundColor: colors.destructiveMuted, borderColor: colors.destructive, color: colors.destructive }]}>
                      {error}
                    </Text>
                  ) : null}

                  <Pressable
                    accessibilityLabel="Create community"
                    accessibilityRole="button"
                    disabled={!canCreate}
                    onPress={handleCreate}
                    style={({ pressed }) => [
                      styles.createButton,
                      { backgroundColor: canCreate ? colors.primary : colors.muted },
                      pressed && canCreate ? styles.createButtonPressed : null,
                    ]}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color={colors.primaryForeground} />
                    ) : (
                      <Text style={[styles.createButtonText, { color: colors.primaryForeground }]}>Create Community</Text>
                    )}
                  </Pressable>
                </View>
              ) : error ? (
                <Text style={[styles.error, { backgroundColor: colors.destructiveMuted, borderColor: colors.destructive, color: colors.destructive }]}>
                  {error}
                </Text>
              ) : null}
            </View>

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Discover</Text>
              <Text style={[styles.sectionMeta, { color: colors.mutedForeground }]}>{communities.length} shown</Text>
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
  const { colors } = useMobileTheme();
  const accent = communityThemeColors[community.theme_color] ?? communityThemeColors.amber;
  const membershipLabel =
    community.member_role === "owner"
      ? "Owner"
      : community.member_role
        ? "Joined"
        : "Join";
  const canLeave = community.member_role && community.member_role !== "owner";

  return (
    <Pressable
      accessibilityLabel={`Open ${community.name}`}
      accessibilityRole="button"
      onPress={onOpen}
      style={({ pressed }) => [
        styles.communityRow,
        { borderBottomColor: colors.border },
        pressed ? { backgroundColor: colors.cardPressed } : null,
      ]}
    >
      <View style={styles.communityTop}>
        <View style={[styles.communityAvatar, { backgroundColor: `${accent}22`, borderColor: colors.border }]}>
          <Text style={[styles.communityAvatarText, { color: accent }]}>
            {community.name.slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <View style={styles.communityBody}>
          <View style={styles.communityNameRow}>
            <Text numberOfLines={1} style={[styles.communityName, { color: colors.foreground }]}>
              {community.name}
            </Text>
            <Text style={[styles.communityHandle, { color: colors.mutedForeground }]}>#{community.handle}</Text>
          </View>
          <Text style={[styles.communityStats, { color: colors.mutedForeground }]}>
            {community.members_count} members - {community.posts_count} posts
          </Text>
        </View>
      </View>

      {community.description ? (
        <Text numberOfLines={3} style={[styles.communityDescription, { color: colors.secondaryForeground }]}>
          {community.description}
        </Text>
      ) : null}

      <View style={styles.communityFooter}>
        <View style={styles.communityTags}>
          {community.tags.slice(0, 3).map((tag) => (
            <View key={tag} style={[styles.communityTag, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.communityTagText, { color: colors.mutedForeground }]}>{tag}</Text>
            </View>
          ))}
        </View>
        <Pressable
          accessibilityLabel={`${canLeave ? "Leave" : membershipLabel} ${community.name}`}
          accessibilityRole="button"
          disabled={isPending || community.member_role === "owner"}
          onPress={(event) => {
            event.stopPropagation();
            onMembershipPress();
          }}
          style={[
            styles.membershipButton,
            {
              backgroundColor: community.member_role ? colors.muted : colors.primary,
              borderColor: canLeave ? colors.destructive : "transparent",
            },
            canLeave ? styles.membershipButtonLeave : null,
            community.member_role === "owner" ? styles.membershipButtonLocked : null,
          ]}
        >
          {isPending ? (
            <ActivityIndicator
              color={community.member_role ? colors.secondaryForeground : colors.primaryForeground}
              size="small"
            />
          ) : (
            <Text
              style={[
                styles.membershipButtonText,
                { color: community.member_role ? colors.secondaryForeground : colors.primaryForeground },
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
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  headerTitle: {
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
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  searchInput: {
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
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "800",
  },
  createPanel: {
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
    fontSize: 16,
    fontWeight: "900",
  },
  createSubtitle: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  form: {
    marginTop: 12,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
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
    fontSize: 12,
    fontWeight: "800",
    marginTop: 7,
  },
  formLabel: {
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
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  tagChipText: {
    fontSize: 12,
    fontWeight: "800",
  },
  error: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  createButton: {
    alignItems: "center",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 44,
    marginTop: 12,
  },
  createButtonPressed: {
    opacity: 0.82,
  },
  createButtonText: {
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
    fontSize: 16,
    fontWeight: "900",
  },
  sectionMeta: {
    fontSize: 12,
    fontWeight: "800",
  },
  communityRow: {
    borderBottomWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 15,
  },
  communityTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  communityAvatar: {
    alignItems: "center",
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
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "900",
  },
  communityHandle: {
    fontSize: 12,
    fontWeight: "800",
  },
  communityStats: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  communityDescription: {
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
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  communityTagText: {
    fontSize: 11,
    fontWeight: "800",
  },
  membershipButton: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 34,
    minWidth: 76,
    paddingHorizontal: 12,
  },
  membershipButtonLeave: {
    borderWidth: 1,
  },
  membershipButtonLocked: {
    opacity: 0.72,
  },
  membershipButtonText: {
    fontSize: 12,
    fontWeight: "900",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 42,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "900",
    marginTop: 10,
    textAlign: "center",
  },
  stateText: {
    marginTop: 10,
    textAlign: "center",
  },
  footerLoader: {
    marginVertical: 16,
  },
});
