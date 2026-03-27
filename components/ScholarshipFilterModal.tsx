import { DropdownData } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FilterState {
  status: "" | "open" | "closed" | "draft";
  applied: boolean | null;
  bookmarked: boolean | null;
  state: string;
  dateFrom: string;
  dateTo: string;
  progressMin: string;
  progressMax: string;
  annualFamilyIncomeMax: string;
  specialCategory: string;
  lastClassPercentageMin: string;
  casteCategory: string;
  gender: string;
  courseName: string;
}

export const DEFAULT_FILTERS: FilterState = {
  status: "",
  applied: null,
  bookmarked: null,
  state: "",
  dateFrom: "",
  dateTo: "",
  progressMin: "",
  progressMax: "",
  annualFamilyIncomeMax: "",
  specialCategory: "",
  lastClassPercentageMin: "",
  casteCategory: "",
  gender: "",
  courseName: "",
};

export const countActiveFilters = (f: FilterState): number => {
  let n = 0;
  if (f.status) n++;
  if (f.applied !== null) n++;
  if (f.bookmarked !== null) n++;
  if (f.state) n++;
  if (f.dateFrom) n++;
  if (f.dateTo) n++;
  if (f.progressMin) n++;
  if (f.progressMax) n++;
  if (f.annualFamilyIncomeMax) n++;
  if (f.specialCategory) n++;
  if (f.lastClassPercentageMin) n++;
  if (f.casteCategory) n++;
  if (f.gender) n++;
  if (f.courseName) n++;
  return n;
};

// ─── Filter Modal Component ───────────────────────────────────────────────────

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: FilterState;
  onApply: (f: FilterState) => void;
  isDark: boolean;
  colors: any;
  dropdownData: DropdownData | null;
}

export function ScholarshipFilterModal({
  visible,
  onClose,
  filters,
  onApply,
  isDark,
  colors,
  dropdownData,
}: FilterModalProps) {
  const [local, setLocal] = useState<FilterState>(filters);
  const [datePickerTarget, setDatePickerTarget] = useState<"from" | "to" | null>(null);

  // Dynamic Picker States
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [showCoursePicker, setShowCoursePicker] = useState(false);
  const [showIncomePicker, setShowIncomePicker] = useState(false);
  const [showCastePicker, setShowCastePicker] = useState(false);
  const [showSpecialPicker, setShowSpecialPicker] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showAppliedPicker, setShowAppliedPicker] = useState(false);
  const [showBookmarkedPicker, setShowBookmarkedPicker] = useState(false);

  useEffect(() => {
    if (visible) {
      setLocal(filters);
    }
  }, [visible, filters]);

  const handleDateConfirm = (date: Date) => {
    const iso = date.toISOString().split("T")[0];
    if (datePickerTarget === "from") setLocal((p) => ({ ...p, dateFrom: iso }));
    else if (datePickerTarget === "to") setLocal((p) => ({ ...p, dateTo: iso }));
    setDatePickerTarget(null);
  };

  const getOptions = (shortname: string) => {
    if (!dropdownData) return [];
    const field = [...(dropdownData.course_fields || []), ...(dropdownData.user_fields || [])].find(
      (f) =>
        f.shortname.toLowerCase() === shortname.toLowerCase() ||
        f.shortname.trim().toLowerCase() === shortname.trim().toLowerCase()
    );
    return field
      ? field.options.filter(
        (o) =>
          o.value !== "Select" &&
          o.value !== "Choose..." &&
          o.value !== "Select any one" &&
          o.value !== "Select any"
      )
      : [];
  };

  const formatDisplay = (iso: string) => {
    if (!iso) return "Select date";
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  };

  const getStatusLabel = (val: string) => {
    const options = [
      { label: "All Status", value: "" },
      { label: "Open", value: "open" },
      { label: "Closed", value: "closed" },
      { label: "Draft", value: "draft" },
    ];
    return options.find((o) => o.value === val)?.label || "All Status";
  };

  const getAppliedLabel = (val: boolean | null) => {
    const options = [
      { label: "Any State", value: null },
      { label: "Applied", value: true },
      { label: "Not Applied", value: false },
    ];
    return options.find((o) => o.value === val)?.label || "Any State";
  };

  const getBookmarkedLabel = (val: boolean | null) => {
    const options = [
      { label: "Any Status", value: null },
      { label: "Bookmarked", value: true },
      { label: "Not Bookmarked", value: false },
    ];
    return options.find((o) => o.value === val)?.label || "Any Status";
  };

  const bgGradient = isDark ? ["#0A0B10", "#141520"] as const : ["#F8F9FF", "#F0F2FF"] as const;
  const card = isDark ? "rgba(30,32,48,0.7)" : "#FFFFFF";
  const border = isDark ? "rgba(255,255,255,0.06)" : "#E8ECF4";
  const accent = "#6366F1";
  const textPrimary = isDark ? "#FFFFFF" : "#1A1A2E";
  const textSecondary = isDark ? "rgba(255,255,255,0.55)" : "#8B92A5";

  const sectionGrad = isDark
    ? (["#000000", "#121212", "#1A1A1A"] as const)
    : (["#FFFFFF", "#F8FAFF", "#F1F5FF"] as const);

  const activeCount = countActiveFilters(local);

  const renderSectionHeader = (title: string, icon: any, color: string) => (
    <View style={fStyles.sectionHeader}>
      <LinearGradient
        colors={isDark ? ([`${color}30`, `${color}10`] as const) : ([`${color}15`, `${color}05`] as const)}
        style={fStyles.sectionIconBg}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name={icon} size={15} color={color} />
      </LinearGradient>
      <Text style={[fStyles.sectionTitle, { color: textPrimary }]}>{title}</Text>
    </View>
  );



  const renderInputField = (
    label: string,
    value: string,
    onChange: (val: string) => void,
    placeholder: string,
    keyboardType: any = "default"
  ) => (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 13, fontWeight: "700", color: textSecondary, marginBottom: 10 }}>{label}</Text>
      <View style={[fStyles.searchBar, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F4F6FF", borderColor: border }]}>
        <TextInput
          style={[fStyles.searchInput, { color: textPrimary }]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={textSecondary}
          keyboardType={keyboardType}
        />
      </View>
    </View>
  );

  const PickerRow = ({ label, value, placeholder, icon, color, onPress }: any) => (
    <View style={{ padding: 18 }}>
      <Text style={{ fontSize: 13, fontWeight: "700", color: textSecondary, marginBottom: 10 }}>{label}</Text>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={[
          fStyles.searchBar,
          { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F4F6FF", borderColor: border, height: 56 },
        ]}
      >
        <Ionicons name={icon} size={18} color={value ? color : textSecondary} />
        <Text
          style={{ flex: 1, fontSize: 15, color: value ? textPrimary : textSecondary, fontWeight: "600" }}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={textSecondary} />
      </TouchableOpacity>
    </View>
  );

  const SelectionModal = ({ visible, onClose, title, options, selected, onSelect }: any) => {
    return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={fStyles.modalOverlay}>
          <TouchableOpacity style={fStyles.modalBackdrop} onPress={onClose} activeOpacity={1} />
          <View style={[fStyles.modalContent, { backgroundColor: isDark ? "#0D0E14" : "#FFF" }]}>
            <View style={fStyles.modalHandle} />
            <View style={fStyles.modalHeader}>
              <Text style={[fStyles.modalTitle, { color: textPrimary }]}>{title}</Text>
              <TouchableOpacity
                onPress={onClose}
                style={[fStyles.iconBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F0F2FF" }]}
              >
                <Ionicons name="close" size={20} color={textPrimary} />
              </TouchableOpacity>
            </View>



            <ScrollView style={{ maxHeight: 450 }} showsVerticalScrollIndicator={false}>
              {options.length > 0 ? (
                options.map((opt: any) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[fStyles.optionRow, { borderBottomColor: border }]}
                    onPress={() => {
                      onSelect(opt.value);
                      onClose();
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        color: textPrimary,
                        flex: 1,
                        fontWeight: selected === opt.value ? "800" : "500",
                      }}
                    >
                      {opt.label}
                    </Text>
                    {selected === opt.value && <Ionicons name="checkmark-circle" size={22} color={accent} />}
                  </TouchableOpacity>
                ))
              ) : (
                <View style={{ padding: 40, alignItems: "center" }}>
                  <Text style={{ color: textSecondary, fontWeight: "600" }}>No results found</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
    >
      <LinearGradient colors={bgGradient} style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        {/* Header */}
        <View style={[fStyles.header, { borderBottomColor: border, backgroundColor: isDark ? "rgba(10, 11, 16, 0.8)" : "rgba(255, 255, 255, 0.9)" }]}>
          <TouchableOpacity onPress={onClose} style={fStyles.closeBtn} activeOpacity={0.7}>
            <View style={[fStyles.iconBtn, { backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "#F0F2FF" }]}>
              <Ionicons name="close" size={20} color={textPrimary} />
            </View>
          </TouchableOpacity>

          <View style={{ flex: 1, marginHorizontal: 16 }}>
            <Text style={[fStyles.headerTitle, { color: textPrimary }]}>Filters</Text>
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
              <View style={[fStyles.activeDot, { backgroundColor: activeCount > 0 ? "#10B981" : textSecondary }]} />
              <Text style={[fStyles.headerSubtitle, { color: textSecondary }]}>
                {activeCount > 0 ? `${activeCount} active filters` : "Default Search"}
              </Text>
            </View>
          </View>

          {activeCount > 0 && (
            <TouchableOpacity
              onPress={() => setLocal(DEFAULT_FILTERS)}
              style={[fStyles.resetBtn, { borderColor: isDark ? "rgba(239, 68, 68, 0.3)" : "#FEE2E2" }]}
            >
              <Text style={{ color: "#EF4444", fontSize: 13, fontWeight: "800" }}>Reset All</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
          {/* Status & Application State */}
          <View style={fStyles.section}>
            {renderSectionHeader("Scholarship Status", "toggle-outline", "#6366F1")}
            <LinearGradient
              colors={sectionGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[fStyles.card, { borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)", borderWidth: 1.5 }]}
            >
              <PickerRow
                label="Current Status"
                icon="flash-outline"
                color="#6366F1"
                value={getStatusLabel(local.status)}
                placeholder="All Status"
                onPress={() => setShowStatusPicker(true)}
              />
              <View style={[fStyles.divider, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]} />
              <PickerRow
                label="Application State"
                icon="checkmark-done-outline"
                color="#10B981"
                value={getAppliedLabel(local.applied)}
                placeholder="Any"
                onPress={() => setShowAppliedPicker(true)}
              />
              <View style={[fStyles.divider, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]} />
              <PickerRow
                label="Bookmarked"
                icon="bookmark-outline"
                color="#F59E0B"
                value={getBookmarkedLabel(local.bookmarked)}
                placeholder="Any"
                onPress={() => setShowBookmarkedPicker(true)}
              />
            </LinearGradient>
          </View>

          {/* Region & Location */}
          <View style={fStyles.section}>
            {renderSectionHeader("Region & Personal", "location-outline", "#F59E0B")}
            <LinearGradient
              colors={sectionGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[fStyles.card, { borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)", borderWidth: 1.5 }]}
            >
              <PickerRow
                label="State / Province"
                icon="map-outline"
                color="#EF4444"
                value={local.state}
                placeholder="All States"
                onPress={() => setShowStatePicker(true)}
              />
              <View style={[fStyles.divider, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]} />
              <PickerRow
                label="Gender"
                icon="transgender-outline"
                color="#6366F1"
                value={local.gender}
                placeholder="All Genders"
                onPress={() => setShowGenderPicker(true)}
              />
            </LinearGradient>
          </View>

          {/* Academic & Career */}
          <View style={fStyles.section}>
            {renderSectionHeader("Academic Details", "school-outline", "#10B981")}
            <LinearGradient
              colors={sectionGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[fStyles.card, { borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)", borderWidth: 1.5 }]}
            >
              <PickerRow
                label="Course Selection"
                icon="book-outline"
                color="#3B82F6"
                value={local.courseName}
                placeholder="Search courses..."
                onPress={() => setShowCoursePicker(true)}
              />
              <View style={[fStyles.divider, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]} />
              {renderInputField(
                "Min Percentage (%)",
                local.lastClassPercentageMin,
                (v) => setLocal((p) => ({ ...p, lastClassPercentageMin: v })),
                "e.g. 60",
                "numeric"
              )}
            </LinearGradient>
          </View>

          {/* Financial & Categories */}
          <View style={fStyles.section}>
            {renderSectionHeader("Eligibility & Categories", "layers-outline", "#8B5CF6")}
            <LinearGradient
              colors={sectionGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[fStyles.card, { borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)", borderWidth: 1.5 }]}
            >
              <PickerRow
                label="Max Annual Income"
                icon="cash-outline"
                color="#10B981"
                value={local.annualFamilyIncomeMax}
                placeholder="Select limit"
                onPress={() => setShowIncomePicker(true)}
              />
              <View style={[fStyles.divider, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]} />
              <PickerRow
                label="Caste Category"
                icon="people-outline"
                color="#8B5CF6"
                value={local.casteCategory}
                placeholder="All Categories"
                onPress={() => setShowCastePicker(true)}
              />
              <View style={[fStyles.divider, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]} />
              <PickerRow
                label="Special Category"
                icon="star-outline"
                color="#CC8400"
                value={local.specialCategory}
                placeholder="Select if applicable"
                onPress={() => setShowSpecialPicker(true)}
              />
            </LinearGradient>
          </View>

          {/* Progress Range */}
          <View style={fStyles.section}>
            {renderSectionHeader("Application Progress (%)", "trending-up-outline", "#3B82F6")}
            <LinearGradient
              colors={sectionGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[fStyles.card, { borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)", borderWidth: 1.5, flexDirection: "row", paddingVertical: 10 }]}
            >
              <View style={{ flex: 1 }}>
                {renderInputField(
                  "Min Progress",
                  local.progressMin,
                  (v) => setLocal((p) => ({ ...p, progressMin: v })),
                  "0",
                  "numeric"
                )}
              </View>
              <View style={{ flex: 1 }}>
                {renderInputField(
                  "Max Progress",
                  local.progressMax,
                  (v) => setLocal((p) => ({ ...p, progressMax: v })),
                  "100",
                  "numeric"
                )}
              </View>
            </LinearGradient>
          </View>

          {/* Date Range */}
          <View style={fStyles.section}>
            {renderSectionHeader("Deadline Period", "calendar-outline", "#EF4444")}
            <LinearGradient
              colors={sectionGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[fStyles.card, { borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)", borderWidth: 1.5 }]}
            >
              <TouchableOpacity style={fStyles.datePickerRow} onPress={() => setDatePickerTarget("from")} activeOpacity={0.7}>
                <Ionicons name="calendar-clear-outline" size={20} color="#EF4444" />
                <View style={{ marginLeft: 14 }}>
                  <Text style={{ fontSize: 12, color: textSecondary, fontWeight: "700" }}>From Date</Text>
                  <Text style={{ fontSize: 15, color: textPrimary, fontWeight: "700", marginTop: 2 }}>
                    {formatDisplay(local.dateFrom)}
                  </Text>
                </View>
              </TouchableOpacity>
              <View style={[fStyles.divider, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]} />
              <TouchableOpacity style={fStyles.datePickerRow} onPress={() => setDatePickerTarget("to")} activeOpacity={0.7}>
                <Ionicons name="calendar-outline" size={20} color="#3B82F6" />
                <View style={{ marginLeft: 14 }}>
                  <Text style={{ fontSize: 12, color: textSecondary, fontWeight: "700" }}>To Date</Text>
                  <Text style={{ fontSize: 15, color: textPrimary, fontWeight: "700", marginTop: 2 }}>
                    {formatDisplay(local.dateTo)}
                  </Text>
                </View>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={[fStyles.footer, { backgroundColor: isDark ? "rgba(10, 11, 16, 0.95)" : "rgba(255,255,255,0.98)", borderTopColor: border }]}>
          <TouchableOpacity
            style={[fStyles.clearAllBtn, { borderColor: border, backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#F1F5F9" }]}
            onPress={() => setLocal(DEFAULT_FILTERS)}
            activeOpacity={0.7}
          >
            <Text style={{ color: textSecondary, fontWeight: "800", fontSize: 15 }}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={fStyles.applyBtn}
            onPress={() => {
              onApply(local);
              onClose();
            }}
            activeOpacity={0.9}
          >
            <LinearGradient colors={["#818CF8", "#6366F1"] as const} style={fStyles.applyBtnGrad}>
              <Text style={{ color: "#FFF", fontWeight: "900", fontSize: 16 }}>Apply Filters</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <SelectionModal
          visible={showStatePicker}
          title="Select State"
          options={getOptions("State")}
          selected={local.state}
          onSelect={(v: string) => setLocal((p) => ({ ...p, state: v }))}
          onClose={() => setShowStatePicker(false)}
        />
        <SelectionModal
          visible={showGenderPicker}
          title="Select Gender"
          options={getOptions("gender")}
          selected={local.gender}
          onSelect={(v: string) => setLocal((p) => ({ ...p, gender: v }))}
          onClose={() => setShowGenderPicker(false)}
        />
        <SelectionModal
          visible={showCastePicker}
          title="Select Caste"
          options={getOptions("caste")}
          selected={local.casteCategory}
          onSelect={(v: string) => setLocal((p) => ({ ...p, casteCategory: v }))}
          onClose={() => setShowCastePicker(false)}
        />
        <SelectionModal
          visible={showSpecialPicker}
          title="Select Special Category"
          options={getOptions("category")}
          selected={local.specialCategory}
          onSelect={(v: string) => setLocal((p) => ({ ...p, specialCategory: v }))}
          onClose={() => setShowSpecialPicker(false)}
        />
        <SelectionModal
          visible={showCoursePicker}
          title="Select Course"
          options={getOptions("course_name_1")}
          selected={local.courseName}
          onSelect={(v: string) => setLocal((p) => ({ ...p, courseName: v }))}
          onClose={() => setShowCoursePicker(false)}
        />
        <SelectionModal
          visible={showIncomePicker}
          title="Annual Family Income"
          options={getOptions("Family_income")}
          selected={local.annualFamilyIncomeMax}
          onSelect={(v: string) => setLocal((p) => ({ ...p, annualFamilyIncomeMax: v }))}
          onClose={() => setShowIncomePicker(false)}
        />
        <SelectionModal
          visible={showStatusPicker}
          title="Filter by Status"
          options={[
            { label: "All Status", value: "" },
            { label: "Open", value: "open" },
            { label: "Closed", value: "closed" },
            { label: "Draft", value: "draft" },
          ]}
          selected={local.status}
          onSelect={(v: any) => setLocal((p) => ({ ...p, status: v }))}
          onClose={() => setShowStatusPicker(false)}
        />
        <SelectionModal
          visible={showAppliedPicker}
          title="Application State"
          options={[
            { label: "Any State", value: "any" },
            { label: "Applied", value: "true" },
            { label: "Not Applied", value: "false" },
          ]}
          selected={String(local.applied)}
          onSelect={(v: string) => {
            const val = v === "any" ? null : v === "true";
            setLocal((p) => ({ ...p, applied: val }));
          }}
          onClose={() => setShowAppliedPicker(false)}
        />
        <SelectionModal
          visible={showBookmarkedPicker}
          title="Bookmark Status"
          options={[
            { label: "Any Status", value: "any" },
            { label: "Bookmarked", value: "true" },
            { label: "Not Bookmarked", value: "false" },
          ]}
          selected={String(local.bookmarked)}
          onSelect={(v: string) => {
            const val = v === "any" ? null : v === "true";
            setLocal((p) => ({ ...p, bookmarked: val }));
          }}
          onClose={() => setShowBookmarkedPicker(false)}
        />

        <DateTimePickerModal
          isVisible={datePickerTarget !== null}
          mode="date"
          onConfirm={handleDateConfirm}
          onCancel={() => setDatePickerTarget(null)}
          isDarkModeEnabled={isDark}
        />
      </LinearGradient>
    </Modal>
  );
}

const fStyles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 64 : (StatusBar.currentHeight ?? 0) + 16,
    paddingBottom: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  closeBtn: { padding: 4 },
  headerTitle: { fontSize: 26, fontWeight: "900", letterSpacing: -1 },
  headerSubtitle: { fontSize: 13, fontWeight: "700" },
  activeDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  resetBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1.5,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    gap: 12,
  },
  searchInput: { flex: 1, fontSize: 16, fontWeight: "700" },
  section: { paddingHorizontal: 24, paddingTop: 32 },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 18, gap: 14 },
  sectionIconBg: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: { fontSize: 18, fontWeight: "800", letterSpacing: -0.5, flex: 1 },
  card: {
    borderRadius: 28,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  divider: { height: 1.5 },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, padding: 20 },
  categoryChip: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: 16,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 48 : 28,
    borderTopWidth: 1,
  },
  clearAllBtn: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  applyBtn: {
    flex: 2,
    borderRadius: 22,
    overflow: "hidden",
  },
  applyBtnGrad: {
    flex: 1,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  datePickerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 22,
  },
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.8)" },
  modalContent: {
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingTop: 18,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === "ios" ? 52 : 28,
    maxHeight: "88%",
  },
  modalHandle: {
    width: 48,
    height: 6,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: { fontSize: 22, fontWeight: "900", letterSpacing: -0.6 },
  modalSearch: {
    flexDirection: "row",
    alignItems: "center",
    height: 56,
    borderRadius: 18,
    paddingHorizontal: 18,
    marginBottom: 24,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
