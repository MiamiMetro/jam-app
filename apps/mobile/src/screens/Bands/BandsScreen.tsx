import React, { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  useAcceptBandApplication,
  useActiveListingCount,
  useApplyToBand,
  useBandApplications,
  useBandListings,
  useCloseBandListing,
  useCreateBandListing,
  useDeleteBandListing,
  useMyBands,
  useMyBandListings,
  useRejectBandApplication,
} from "@/hooks/useBands";
import type { BandApplicationItem, BandListingItem, MyBandItem } from "@/types";

const SEEKING_ROLES = [
  "Vocalist",
  "Guitarist",
  "Bassist",
  "Drummer",
  "Keyboardist",
  "Producer",
  "Other",
];

const GENRES = [
  "Rock",
  "Metal",
  "Pop",
  "Jazz",
  "Blues",
  "Electronic",
  "Hip Hop",
  "R&B",
  "Reggae",
  "Classical",
  "Indie",
  "Acoustic",
  "LoFi",
  "Punk",
  "Alternative",
  "Other",
];

const INSTRUMENTS = [
  "Vocal",
  "Guitar",
  "Bass",
  "Drums",
  "Keyboard",
  "Synthesizer",
  "Violin",
  "Saxophone",
  "Trumpet",
  "Flute",
  "Percussion",
  "Producer",
  "Other",
];

type BandsView = "all" | "myListings" | "joined";

export default function BandsScreen() {
  const navigation = useNavigation<any>();
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState<string | undefined>();
  const [activeView, setActiveView] = useState<BandsView>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [applyListing, setApplyListing] = useState<BandListingItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    data: listings,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useBandListings({
    search,
    seekingRole: selectedRole,
  });
  const {
    data: myListings,
    fetchNextPage: fetchNextMyListings,
    hasNextPage: hasNextMyListings,
    isFetchingNextPage: isFetchingNextMyListings,
    isLoading: isMyListingsLoading,
  } = useMyBandListings();
  const {
    data: myBands,
    fetchNextPage: fetchNextMyBands,
    hasNextPage: hasNextMyBands,
    isFetchingNextPage: isFetchingNextMyBands,
    isLoading: isMyBandsLoading,
  } = useMyBands();

  const visibleItems: Array<BandListingItem | MyBandItem> =
    activeView === "joined"
      ? myBands
      : activeView === "myListings"
        ? myListings
        : listings;
  const visibleLoading =
    activeView === "joined"
      ? isMyBandsLoading
      : activeView === "myListings"
        ? isMyListingsLoading
        : isLoading;
  const visibleLoadingMore =
    activeView === "joined"
      ? isFetchingNextMyBands
      : activeView === "myListings"
        ? isFetchingNextMyListings
        : isFetchingNextPage;

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        contentContainerStyle={[
          styles.content,
          visibleItems.length === 0 ? styles.emptyContent : null,
        ]}
        data={visibleItems}
        keyExtractor={(item) =>
          isMyBandItem(item) ? `${item.membership_role}:${item.listing.id}` : item.id
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {visibleLoading ? (
              <>
                <ActivityIndicator color="#D8A64A" />
                <Text style={styles.stateText}>
                  {activeView === "joined"
                    ? "Loading your bands..."
                    : activeView === "myListings"
                      ? "Loading your listings..."
                      : "Loading bands..."}
                </Text>
              </>
            ) : (
              <>
                <Ionicons color="#8F98A8" name="people-circle-outline" size={34} />
                <Text style={styles.emptyTitle}>
                  {activeView === "joined"
                    ? "No bands yet"
                    : activeView === "myListings"
                      ? "No listings yet"
                      : "No band listings found"}
                </Text>
                <Text style={styles.stateText}>
                  {activeView === "joined"
                    ? "Create a listing or join a band to see it here."
                    : activeView === "myListings"
                      ? "Create your first band listing to find musicians."
                      : "Try another search or create one."}
                </Text>
              </>
            )}
          </View>
        }
        ListFooterComponent={
          visibleLoadingMore ? (
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
                <Text style={styles.headerEyebrow}>Find musicians</Text>
                <Text style={styles.headerTitle}>Bands</Text>
              </View>
            </View>

            <View style={styles.tabs}>
              <Pressable
                onPress={() => setActiveView("all")}
                style={[styles.tabButton, activeView === "all" ? styles.tabButtonActive : null]}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    activeView === "all" ? styles.tabButtonTextActive : null,
                  ]}
                >
                  All Listings
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setActiveView("myListings")}
                style={[
                  styles.tabButton,
                  activeView === "myListings" ? styles.tabButtonActive : null,
                ]}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    activeView === "myListings" ? styles.tabButtonTextActive : null,
                  ]}
                >
                  My Listings {myListings.length > 0 ? `(${myListings.length})` : ""}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setActiveView("joined")}
                style={[
                  styles.tabButton,
                  activeView === "joined" ? styles.tabButtonActive : null,
                ]}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    activeView === "joined" ? styles.tabButtonTextActive : null,
                  ]}
                >
                  My Bands {myBands.length > 0 ? `(${myBands.length})` : ""}
                </Text>
              </Pressable>
            </View>

            {activeView === "all" ? (
              <View style={styles.searchPanel}>
                <View style={styles.searchBox}>
                  <Ionicons color="#8F98A8" name="search" size={17} />
                  <TextInput
                    onChangeText={setSearch}
                    placeholder="Search bands"
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
                  data={["All", ...SEEKING_ROLES]}
                  horizontal
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => {
                    const isAll = item === "All";
                    const isSelected = isAll ? !selectedRole : selectedRole === item;
                    return (
                      <Pressable
                        onPress={() => setSelectedRole(isAll ? undefined : item)}
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
            ) : null}

            {activeView !== "joined" ? (
              <Pressable
                onPress={() => {
                  setError(null);
                  setIsCreateOpen(true);
                }}
                style={styles.createShortcut}
              >
                <View style={styles.createIcon}>
                  <Ionicons color="#D8A64A" name="add" size={20} />
                </View>
                <View style={styles.createText}>
                  <Text style={styles.createTitle}>Create band listing</Text>
                  <Text style={styles.createSubtitle}>Open a call for the musician you need.</Text>
                </View>
                <Ionicons color="#8F98A8" name="chevron-forward" size={20} />
              </Pressable>
            ) : null}

            {error ? <Text style={[styles.error, styles.outerError]}>{error}</Text> : null}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {activeView === "joined"
                  ? "My Bands"
                  : activeView === "myListings"
                    ? "My Listings"
                    : "Discover"}
              </Text>
              <Text style={styles.sectionMeta}>{visibleItems.length} shown</Text>
            </View>
          </>
        }
        onEndReached={() => {
          if (activeView === "joined") {
            if (hasNextMyBands && !isFetchingNextMyBands) {
              fetchNextMyBands();
            }
            return;
          }
          if (activeView === "myListings") {
            if (hasNextMyListings && !isFetchingNextMyListings) {
              fetchNextMyListings();
            }
            return;
          }
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        renderItem={({ item }) => {
          if (isMyBandItem(item)) {
            return <MyBandCard band={item} />;
          }
          return activeView === "myListings" ? (
            <MyBandListingCard listing={item} onError={setError} />
          ) : (
            <BandListingRow listing={item} onApply={() => setApplyListing(item)} />
          );
        }}
      />

      <CreateBandListingModal
        onClose={() => setIsCreateOpen(false)}
        onError={setError}
        open={isCreateOpen}
      />
      <BandApplicationModal
        listing={applyListing}
        onClose={() => setApplyListing(null)}
        onError={setError}
      />
    </SafeAreaView>
  );
}

function BandListingRow({
  listing,
  onApply,
}: {
  listing: BandListingItem;
  onApply: () => void;
}) {
  return (
    <View style={styles.listingRow}>
      <View style={styles.listingTop}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{listing.band_name.slice(0, 2).toUpperCase()}</Text>
        </View>
        <View style={styles.listingBody}>
          <View style={styles.titleRow}>
            <Text numberOfLines={1} style={styles.listingTitle}>
              {listing.band_name}
            </Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{listing.seeking_role}</Text>
            </View>
          </View>
          <Text style={styles.listingMeta}>
            {listing.current_members}/{listing.max_members} members - {listing.region}
            {listing.genre ? ` - ${listing.genre}` : ""}
          </Text>
          <Text style={styles.ownerText}>by @{listing.owner?.username || "unknown"}</Text>
        </View>
      </View>

      {listing.description ? (
        <Text numberOfLines={3} style={styles.description}>
          {listing.description}
        </Text>
      ) : null}

      <View style={styles.rowFooter}>
        <Text style={styles.applicationCount}>
          {listing.applications_count} application
          {listing.applications_count === 1 ? "" : "s"}
        </Text>
        <Pressable onPress={onApply} style={styles.primarySmallButton}>
          <Text style={styles.primarySmallButtonText}>Apply</Text>
        </Pressable>
      </View>
    </View>
  );
}

function isMyBandItem(item: BandListingItem | MyBandItem): item is MyBandItem {
  return "membership_role" in item;
}

function formatShortDate(value: string | null) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

function MyBandCard({ band }: { band: MyBandItem }) {
  const isOwner = band.membership_role === "owner";
  const activityDate = formatShortDate(band.joined_at);
  const activityLabel = isOwner ? "created" : "joined";
  const listing = band.listing;

  return (
    <View style={styles.listingRow}>
      <View style={styles.listingTop}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {listing.band_name.slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <View style={styles.listingBody}>
          <View style={styles.titleRow}>
            <Text numberOfLines={1} style={styles.listingTitle}>
              {listing.band_name}
            </Text>
            <View
              style={[
                styles.membershipBadge,
                isOwner ? styles.ownerMembershipBadge : styles.memberMembershipBadge,
              ]}
            >
              <Text
                style={[
                  styles.membershipBadgeText,
                  isOwner ? styles.ownerMembershipText : styles.memberMembershipText,
                ]}
              >
                {isOwner ? "Owner" : "Member"}
              </Text>
            </View>
            {band.application ? (
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{band.application.instrument}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.listingMeta}>
            {listing.current_members}/{listing.max_members} members - {listing.region}
            {listing.genre ? ` - ${listing.genre}` : ""}
          </Text>
          {listing.description ? (
            <Text numberOfLines={2} style={styles.description}>
              {listing.description}
            </Text>
          ) : null}
          <Text style={styles.ownerText}>
            by @{listing.owner?.username || "unknown"}
            {activityDate ? ` - ${activityLabel} ${activityDate}` : ""}
          </Text>
        </View>
      </View>
    </View>
  );
}

function MyBandListingCard({
  listing,
  onError,
}: {
  listing: BandListingItem;
  onError: (message: string | null) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const closeListing = useCloseBandListing();
  const deleteListing = useDeleteBandListing();
  const isClosed = listing.status === "closed";

  const handleClose = async () => {
    try {
      onError(null);
      await closeListing.mutateAsync(listing.id);
    } catch (err) {
      onError(getBandErrorMessage(err));
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete listing?",
      "All applications for this listing will also be deleted.",
      [
        { style: "cancel", text: "Cancel" },
        {
          style: "destructive",
          text: "Delete",
          onPress: async () => {
            try {
              onError(null);
              await deleteListing.mutateAsync(listing.id);
            } catch (err) {
              onError(getBandErrorMessage(err));
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.myListingCard, isClosed ? styles.closedCard : null]}>
      <View style={styles.myListingHeader}>
        <View style={styles.myListingTitleWrap}>
          <View style={styles.titleRow}>
            <Text numberOfLines={1} style={styles.listingTitle}>
              {listing.band_name}
            </Text>
            <View style={[styles.statusBadge, isClosed ? styles.statusBadgeClosed : null]}>
              <Text style={[styles.statusBadgeText, isClosed ? styles.statusBadgeTextClosed : null]}>
                {isClosed ? "Closed" : "Open"}
              </Text>
            </View>
          </View>
          <Text style={styles.listingMeta}>
            {listing.current_members}/{listing.max_members} members - Looking for {listing.seeking_role}
          </Text>
          <Text style={styles.listingMeta}>
            {listing.region}{listing.genre ? ` - ${listing.genre}` : ""}
          </Text>
        </View>
      </View>

      {listing.description ? (
        <Text numberOfLines={2} style={styles.description}>
          {listing.description}
        </Text>
      ) : null}

      <View style={styles.myActions}>
        <Pressable
          disabled={isClosed || closeListing.isPending}
          onPress={handleClose}
          style={[
            styles.secondaryButton,
            isClosed || closeListing.isPending ? styles.disabledButton : null,
          ]}
        >
          <Text style={styles.secondaryButtonText}>Close</Text>
        </Pressable>
        <Pressable
          disabled={deleteListing.isPending}
          onPress={handleDelete}
          style={styles.dangerButton}
        >
          <Text style={styles.dangerButtonText}>Delete</Text>
        </Pressable>
        <Pressable
          onPress={() => setExpanded((value) => !value)}
          style={styles.expandButton}
        >
          <Text style={styles.expandButtonText}>
            {listing.applications_count} Applications
          </Text>
          <Ionicons
            color="#D8A64A"
            name={expanded ? "chevron-up" : "chevron-down"}
            size={16}
          />
        </Pressable>
      </View>

      {expanded ? (
        <ApplicationsPanel listingId={listing.id} onError={onError} />
      ) : null}
    </View>
  );
}

function ApplicationsPanel({
  listingId,
  onError,
}: {
  listingId: string;
  onError: (message: string | null) => void;
}) {
  const {
    data: applications,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useBandApplications(listingId);

  return (
    <View style={styles.applicationsPanel}>
      {isLoading ? (
        <View style={styles.inlineLoading}>
          <ActivityIndicator color="#D8A64A" />
          <Text style={styles.stateText}>Loading applications...</Text>
        </View>
      ) : applications.length === 0 ? (
        <Text style={styles.noApplications}>No applications yet</Text>
      ) : (
        <>
          {applications.map((application) => (
            <ApplicationRow
              application={application}
              key={application.id}
              onError={onError}
            />
          ))}
          {hasNextPage ? (
            <Pressable
              disabled={isFetchingNextPage}
              onPress={fetchNextPage}
              style={styles.loadMoreButton}
            >
              {isFetchingNextPage ? (
                <ActivityIndicator color="#D8A64A" />
              ) : (
                <Text style={styles.loadMoreText}>Load more</Text>
              )}
            </Pressable>
          ) : null}
        </>
      )}
    </View>
  );
}

function ApplicationRow({
  application,
  onError,
}: {
  application: BandApplicationItem;
  onError: (message: string | null) => void;
}) {
  const acceptApplication = useAcceptBandApplication();
  const rejectApplication = useRejectBandApplication();
  const isPending = application.status === "pending";
  const isBusy = acceptApplication.isPending || rejectApplication.isPending;

  const handleAccept = async () => {
    try {
      onError(null);
      await acceptApplication.mutateAsync(application.id);
    } catch (err) {
      onError(getBandErrorMessage(err));
    }
  };

  const handleReject = async () => {
    try {
      onError(null);
      await rejectApplication.mutateAsync(application.id);
    } catch (err) {
      onError(getBandErrorMessage(err));
    }
  };

  return (
    <View style={styles.applicationRow}>
      <View style={styles.applicationHeader}>
        <View style={styles.smallAvatar}>
          <Text style={styles.smallAvatarText}>
            {application.applicant?.username?.slice(0, 2).toUpperCase() || "?"}
          </Text>
        </View>
        <View style={styles.applicationBody}>
          <View style={styles.titleRow}>
            <Text numberOfLines={1} style={styles.applicantName}>
              @{application.applicant?.username || "unknown"}
            </Text>
            <View
              style={[
                styles.applicationStatus,
                application.status === "accepted" ? styles.applicationStatusAccepted : null,
                application.status === "rejected" ? styles.applicationStatusRejected : null,
              ]}
            >
              <Text
                style={[
                  styles.applicationStatusText,
                  application.status === "accepted"
                    ? styles.applicationStatusAcceptedText
                    : null,
                  application.status === "rejected"
                    ? styles.applicationStatusRejectedText
                    : null,
                ]}
              >
                {application.status}
              </Text>
            </View>
          </View>
          <Text style={styles.instrumentText}>{application.instrument}</Text>
        </View>
      </View>
      <Text style={styles.applicationText}>{application.experience}</Text>
      {application.message ? (
        <Text style={styles.applicationMessage}>{application.message}</Text>
      ) : null}
      {isPending ? (
        <View style={styles.reviewActions}>
          <Pressable
            disabled={isBusy}
            onPress={handleAccept}
            style={[styles.acceptButton, isBusy ? styles.disabledButton : null]}
          >
            <Text style={styles.acceptButtonText}>Accept</Text>
          </Pressable>
          <Pressable
            disabled={isBusy}
            onPress={handleReject}
            style={[styles.rejectButton, isBusy ? styles.disabledButton : null]}
          >
            <Text style={styles.rejectButtonText}>Reject</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function CreateBandListingModal({
  onClose,
  onError,
  open,
}: {
  onClose: () => void;
  onError: (message: string | null) => void;
  open: boolean;
}) {
  const createListing = useCreateBandListing();
  const activeCount = useActiveListingCount();
  const [bandName, setBandName] = useState("");
  const [currentMembers, setCurrentMembers] = useState(1);
  const [maxMembers, setMaxMembers] = useState(5);
  const [seekingRole, setSeekingRole] = useState("Guitarist");
  const [region, setRegion] = useState("");
  const [genre, setGenre] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const atLimit = activeCount >= 3;
  const canCreate = bandName.trim() && region.trim() && !atLimit && !createListing.isPending;

  const handleClose = () => {
    setBandName("");
    setCurrentMembers(1);
    setMaxMembers(5);
    setSeekingRole("Guitarist");
    setRegion("");
    setGenre("");
    setDescription("");
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!canCreate) return;

    try {
      setError(null);
      onError(null);
      await createListing.mutateAsync({
        bandName: bandName.trim(),
        currentMembers,
        description: description.trim() || undefined,
        genre: genre || undefined,
        maxMembers,
        region: region.trim(),
        seekingRole,
      });
      handleClose();
    } catch (err) {
      setError(getBandErrorMessage(err));
    }
  };

  return (
    <Modal animationType="slide" onRequestClose={handleClose} transparent visible={open}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Band Listing</Text>
            <Pressable onPress={handleClose} style={styles.modalCloseButton}>
              <Ionicons color="#8F98A8" name="close" size={20} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            {atLimit ? (
              <Text style={styles.error}>
                You've reached the limit of 3 active listings.
              </Text>
            ) : null}

            <TextInput
              maxLength={50}
              onChangeText={setBandName}
              placeholder="Band name"
              placeholderTextColor="#7E8796"
              style={styles.input}
              value={bandName}
            />

            <View style={styles.memberRow}>
              <NumberStepper
                label="Current Members"
                max={maxMembers}
                min={1}
                onChange={setCurrentMembers}
                value={currentMembers}
              />
              <NumberStepper
                label="Total Capacity"
                max={50}
                min={2}
                onChange={(value) => {
                  setMaxMembers(value);
                  setCurrentMembers((current) => Math.min(current, value));
                }}
                value={maxMembers}
              />
            </View>

            <Text style={styles.formLabel}>Looking For</Text>
            <View style={styles.chipGrid}>
              {SEEKING_ROLES.map((role) => (
                <ChoiceChip
                  active={seekingRole === role}
                  key={role}
                  label={role}
                  onPress={() => setSeekingRole(role)}
                />
              ))}
            </View>

            <TextInput
              maxLength={100}
              onChangeText={setRegion}
              placeholder="Region"
              placeholderTextColor="#7E8796"
              style={styles.input}
              value={region}
            />

            <Text style={styles.formLabel}>Genre</Text>
            <View style={styles.chipGrid}>
              {GENRES.map((item) => (
                <ChoiceChip
                  active={genre === item}
                  key={item}
                  label={item}
                  onPress={() => setGenre(genre === item ? "" : item)}
                />
              ))}
            </View>

            <TextInput
              maxLength={500}
              multiline
              onChangeText={setDescription}
              placeholder="Tell people about your band"
              placeholderTextColor="#7E8796"
              style={[styles.input, styles.textArea]}
              textAlignVertical="top"
              value={description}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              disabled={!canCreate}
              onPress={handleSubmit}
              style={[styles.fullButton, !canCreate ? styles.disabledButton : null]}
            >
              {createListing.isPending ? (
                <ActivityIndicator color="#251B0A" />
              ) : (
                <Text style={styles.fullButtonText}>Create Listing</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function BandApplicationModal({
  listing,
  onClose,
  onError,
}: {
  listing: BandListingItem | null;
  onClose: () => void;
  onError: (message: string | null) => void;
}) {
  const applyToBand = useApplyToBand();
  const [instrument, setInstrument] = useState("Guitar");
  const [experience, setExperience] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const canApply =
    !!listing &&
    experience.trim().length >= 10 &&
    !applyToBand.isPending;

  const handleClose = () => {
    setInstrument("Guitar");
    setExperience("");
    setMessage("");
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!listing || !canApply) return;

    try {
      setError(null);
      onError(null);
      await applyToBand.mutateAsync({
        experience: experience.trim(),
        instrument,
        listingId: listing.id,
        message: message.trim() || undefined,
      });
      handleClose();
    } catch (err) {
      setError(getBandErrorMessage(err));
    }
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={handleClose}
      transparent
      visible={!!listing}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Apply to {listing?.band_name || "Band"}</Text>
            <Pressable onPress={handleClose} style={styles.modalCloseButton}>
              <Ionicons color="#8F98A8" name="close" size={20} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            {listing ? (
              <View style={styles.listingSummary}>
                <Text style={styles.listingSummaryText}>
                  Looking for {listing.seeking_role} - {listing.current_members}/
                  {listing.max_members} members - {listing.region}
                </Text>
              </View>
            ) : null}

            <Text style={styles.formLabel}>Your Instrument</Text>
            <View style={styles.chipGrid}>
              {INSTRUMENTS.map((item) => (
                <ChoiceChip
                  active={instrument === item}
                  key={item}
                  label={item}
                  onPress={() => setInstrument(item)}
                />
              ))}
            </View>

            <TextInput
              maxLength={300}
              multiline
              onChangeText={setExperience}
              placeholder="Tell them about your musical experience"
              placeholderTextColor="#7E8796"
              style={[styles.input, styles.textArea]}
              textAlignVertical="top"
              value={experience}
            />
            <Text style={styles.helpText}>Min 10 characters</Text>

            <TextInput
              maxLength={500}
              multiline
              onChangeText={setMessage}
              placeholder="Message (optional)"
              placeholderTextColor="#7E8796"
              style={[styles.input, styles.messageArea]}
              textAlignVertical="top"
              value={message}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              disabled={!canApply}
              onPress={handleSubmit}
              style={[styles.fullButton, !canApply ? styles.disabledButton : null]}
            >
              {applyToBand.isPending ? (
                <ActivityIndicator color="#251B0A" />
              ) : (
                <Text style={styles.fullButtonText}>Send Application</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function NumberStepper({
  label,
  max,
  min,
  onChange,
  value,
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <View style={styles.stepper}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperControls}>
        <Pressable
          disabled={value <= min}
          onPress={() => onChange(Math.max(min, value - 1))}
          style={[styles.stepperButton, value <= min ? styles.disabledButton : null]}
        >
          <Text style={styles.stepperButtonText}>-</Text>
        </Pressable>
        <Text style={styles.stepperValue}>{value}</Text>
        <Pressable
          disabled={value >= max}
          onPress={() => onChange(Math.min(max, value + 1))}
          style={[styles.stepperButton, value >= max ? styles.disabledButton : null]}
        >
          <Text style={styles.stepperButtonText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ChoiceChip({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.choiceChip, active ? styles.choiceChipActive : null]}
    >
      <Text style={[styles.choiceChipText, active ? styles.choiceChipTextActive : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

function getBandErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const stripped = message.replace(/^[A-Z_]+:\s*/, "");

  if (message.includes("LISTING_LIMIT_REACHED")) {
    return "You can have at most 3 active listings.";
  }
  if (message.includes("ALREADY_APPLIED")) {
    return "You have already applied to this listing.";
  }
  if (message.includes("CANNOT_APPLY_OWN")) {
    return "You cannot apply to your own listing.";
  }
  if (message.includes("LISTING_CLOSED")) {
    return "This listing is no longer accepting applications.";
  }
  if (message.includes("EXPERIENCE_TOO_SHORT")) {
    return "Experience must be at least 10 characters.";
  }
  if (message.includes("BAND_FULL")) {
    return "This band is already at capacity.";
  }
  if (message.includes("APPLICATION_ALREADY_REVIEWED")) {
    return "This application has already been reviewed.";
  }
  if (message.includes("Rate limit")) {
    return "Slow down for a moment before trying again.";
  }

  return stripped || "Something went wrong. Please try again.";
}

const styles = StyleSheet.create({
  acceptButton: {
    alignItems: "center",
    backgroundColor: "rgba(79,180,119,0.16)",
    borderColor: "rgba(79,180,119,0.34)",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 34,
    justifyContent: "center",
  },
  acceptButtonText: {
    color: "#8BE0AD",
    fontSize: 12,
    fontWeight: "900",
  },
  applicationBody: {
    flex: 1,
    minWidth: 0,
  },
  applicationCount: {
    color: "#8F98A8",
    fontSize: 12,
    fontWeight: "800",
  },
  applicationHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  applicationMessage: {
    color: "#AEB6C4",
    fontSize: 12,
    fontStyle: "italic",
    lineHeight: 18,
    marginTop: 6,
  },
  applicationRow: {
    borderBottomColor: "rgba(255,255,255,0.08)",
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  applicationsPanel: {
    borderTopColor: "rgba(255,255,255,0.08)",
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 4,
  },
  applicationStatus: {
    backgroundColor: "rgba(216,166,74,0.14)",
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  applicationStatusAccepted: {
    backgroundColor: "rgba(79,180,119,0.16)",
  },
  applicationStatusAcceptedText: {
    color: "#8BE0AD",
  },
  applicationStatusRejected: {
    backgroundColor: "rgba(248,113,113,0.16)",
  },
  applicationStatusRejectedText: {
    color: "#FECACA",
  },
  applicationStatusText: {
    color: "#D8A64A",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "capitalize",
  },
  applicationText: {
    color: "#C7CCD6",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  applicantName: {
    color: "#EEF0F5",
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "900",
  },
  avatar: {
    alignItems: "center",
    backgroundColor: "rgba(216,166,74,0.13)",
    borderColor: "rgba(216,166,74,0.24)",
    borderRadius: 8,
    borderWidth: 1,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  avatarText: {
    color: "#D8A64A",
    fontSize: 13,
    fontWeight: "900",
  },
  backButton: {
    alignItems: "center",
    borderRadius: 8,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 9,
  },
  choiceChip: {
    backgroundColor: "#1E2330",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  choiceChipActive: {
    backgroundColor: "rgba(216,166,74,0.14)",
    borderColor: "rgba(216,166,74,0.42)",
  },
  choiceChipText: {
    color: "#8F98A8",
    fontSize: 12,
    fontWeight: "800",
  },
  choiceChipTextActive: {
    color: "#D8A64A",
  },
  clearButton: {
    alignItems: "center",
    borderRadius: 8,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  closedCard: {
    opacity: 0.72,
  },
  container: {
    backgroundColor: "#1A1E29",
    flex: 1,
  },
  content: {
    paddingBottom: 22,
  },
  createIcon: {
    alignItems: "center",
    backgroundColor: "rgba(216,166,74,0.12)",
    borderRadius: 8,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  createShortcut: {
    alignItems: "center",
    backgroundColor: "#262B37",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginHorizontal: 14,
    marginTop: 14,
    padding: 14,
  },
  createSubtitle: {
    color: "#8F98A8",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    marginTop: 3,
  },
  createText: {
    flex: 1,
    minWidth: 0,
  },
  createTitle: {
    color: "#EEF0F5",
    fontSize: 16,
    fontWeight: "900",
  },
  dangerButton: {
    alignItems: "center",
    backgroundColor: "rgba(248,113,113,0.12)",
    borderColor: "rgba(248,113,113,0.3)",
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 34,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  dangerButtonText: {
    color: "#FECACA",
    fontSize: 12,
    fontWeight: "900",
  },
  description: {
    color: "#C7CCD6",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  disabledButton: {
    opacity: 0.52,
  },
  emptyContent: {
    flexGrow: 1,
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
  expandButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    marginLeft: "auto",
    minHeight: 34,
  },
  expandButtonText: {
    color: "#D8A64A",
    fontSize: 12,
    fontWeight: "900",
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
  filterList: {
    gap: 8,
    paddingTop: 12,
  },
  footerLoader: {
    marginVertical: 16,
  },
  formLabel: {
    color: "#D5D9E2",
    fontSize: 13,
    fontWeight: "900",
    marginTop: 14,
  },
  fullButton: {
    alignItems: "center",
    backgroundColor: "#D8A64A",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 44,
    marginTop: 14,
  },
  fullButtonText: {
    color: "#251B0A",
    fontSize: 14,
    fontWeight: "900",
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
  headerEyebrow: {
    color: "#8F98A8",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    color: "#EEF0F5",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0,
    marginTop: 2,
  },
  helpText: {
    color: "#8F98A8",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 6,
  },
  inlineLoading: {
    alignItems: "center",
    paddingVertical: 18,
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
  instrumentText: {
    color: "#D8A64A",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },
  listingBody: {
    flex: 1,
    minWidth: 0,
  },
  listingMeta: {
    color: "#8F98A8",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  listingRow: {
    borderBottomColor: "rgba(255,255,255,0.08)",
    borderBottomWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 15,
  },
  listingSummary: {
    backgroundColor: "#1E2330",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  listingSummaryText: {
    color: "#C7CCD6",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },
  listingTitle: {
    color: "#EEF0F5",
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "900",
  },
  listingTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  loadMoreButton: {
    alignItems: "center",
    borderRadius: 8,
    minHeight: 38,
    justifyContent: "center",
  },
  loadMoreText: {
    color: "#D8A64A",
    fontSize: 12,
    fontWeight: "900",
  },
  memberRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  memberMembershipBadge: {
    backgroundColor: "rgba(79,180,119,0.16)",
  },
  memberMembershipText: {
    color: "#8BE0AD",
  },
  membershipBadge: {
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  membershipBadgeText: {
    fontSize: 10,
    fontWeight: "900",
  },
  messageArea: {
    minHeight: 82,
    paddingVertical: 10,
  },
  modalBackdrop: {
    backgroundColor: "rgba(0,0,0,0.58)",
    flex: 1,
    justifyContent: "flex-end",
  },
  modalCloseButton: {
    alignItems: "center",
    borderRadius: 8,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  modalContent: {
    padding: 16,
    paddingBottom: 24,
  },
  modalHeader: {
    alignItems: "center",
    borderBottomColor: "rgba(255,255,255,0.08)",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalSheet: {
    backgroundColor: "#1A1E29",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    maxHeight: "90%",
  },
  modalTitle: {
    color: "#EEF0F5",
    fontSize: 18,
    fontWeight: "900",
  },
  myActions: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  myListingCard: {
    backgroundColor: "#262B37",
    borderBottomColor: "rgba(255,255,255,0.08)",
    borderBottomWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 15,
  },
  myListingHeader: {
    flexDirection: "row",
    gap: 10,
  },
  myListingTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  noApplications: {
    color: "#8F98A8",
    fontSize: 12,
    fontWeight: "800",
    paddingVertical: 14,
    textAlign: "center",
  },
  outerError: {
    marginHorizontal: 14,
  },
  ownerMembershipBadge: {
    backgroundColor: "rgba(216,166,74,0.14)",
  },
  ownerMembershipText: {
    color: "#D8A64A",
  },
  ownerText: {
    color: "#8F98A8",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
  },
  primarySmallButton: {
    alignItems: "center",
    backgroundColor: "#D8A64A",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 34,
    paddingHorizontal: 16,
  },
  primarySmallButtonText: {
    color: "#251B0A",
    fontSize: 12,
    fontWeight: "900",
  },
  rejectButton: {
    alignItems: "center",
    backgroundColor: "rgba(248,113,113,0.12)",
    borderColor: "rgba(248,113,113,0.3)",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 34,
    justifyContent: "center",
  },
  rejectButtonText: {
    color: "#FECACA",
    fontSize: 12,
    fontWeight: "900",
  },
  reviewActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  roleBadge: {
    backgroundColor: "rgba(216,166,74,0.14)",
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  roleBadgeText: {
    color: "#D8A64A",
    fontSize: 10,
    fontWeight: "900",
  },
  rowFooter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
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
  searchPanel: {
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#353B49",
    borderRadius: 8,
    minHeight: 34,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  secondaryButtonText: {
    color: "#D5D9E2",
    fontSize: 12,
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
  sectionMeta: {
    color: "#8F98A8",
    fontSize: 12,
    fontWeight: "800",
  },
  sectionTitle: {
    color: "#EEF0F5",
    fontSize: 16,
    fontWeight: "900",
  },
  smallAvatar: {
    alignItems: "center",
    backgroundColor: "#353B49",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  smallAvatarText: {
    color: "#C7CCD6",
    fontSize: 11,
    fontWeight: "900",
  },
  stateText: {
    color: "#8F98A8",
    marginTop: 10,
    textAlign: "center",
  },
  statusBadge: {
    backgroundColor: "rgba(79,180,119,0.16)",
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  statusBadgeClosed: {
    backgroundColor: "#353B49",
  },
  statusBadgeText: {
    color: "#8BE0AD",
    fontSize: 10,
    fontWeight: "900",
  },
  statusBadgeTextClosed: {
    color: "#8F98A8",
  },
  stepper: {
    flex: 1,
  },
  stepperButton: {
    alignItems: "center",
    backgroundColor: "#353B49",
    borderRadius: 8,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  stepperButtonText: {
    color: "#D5D9E2",
    fontSize: 18,
    fontWeight: "900",
  },
  stepperControls: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  stepperLabel: {
    color: "#8F98A8",
    fontSize: 12,
    fontWeight: "800",
  },
  stepperValue: {
    color: "#EEF0F5",
    fontSize: 15,
    fontWeight: "900",
    minWidth: 24,
    textAlign: "center",
  },
  tabButton: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  tabButtonActive: {
    backgroundColor: "rgba(216,166,74,0.14)",
  },
  tabButtonText: {
    color: "#8F98A8",
    fontSize: 12,
    fontWeight: "900",
  },
  tabButtonTextActive: {
    color: "#D8A64A",
  },
  tabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  textArea: {
    lineHeight: 21,
    minHeight: 104,
    paddingVertical: 10,
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
});
