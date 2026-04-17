import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import { Check, Circle, MoveRight, Sparkles } from "lucide-react-native";
import { createBooking, fetchAvailability, fetchBusiness } from "../lib/api";
import { loadSavedProfile, saveBooking, saveProfile } from "../lib/storage";
import { colors, radii, shadows, spacing } from "../theme";
import type { AvailabilitySlot, PublicBusiness, SavedBooking, SavedProfile } from "../types";
import { ErrorState } from "../components/ErrorState";
import { ProfessionalCard } from "../components/ProfessionalCard";
import { StepIndicator } from "../components/StepIndicator";
import type { RootStackParamList } from "../../App";

type Props = NativeStackScreenProps<RootStackParamList, "Booking">;
type ResolvedSlot = AvailabilitySlot & { professionalId: string; professionalName: string };
type SelectedProfessional = "ANY" | string;
type FormErrors = { name?: string; email?: string; phone?: string; variant?: string };

const stepLabels = [
  "Escolha o servico",
  "Escolha o profissional",
  "Escolha a data e o horario",
  "Confirme seus dados",
];

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((cents ?? 0) / 100);
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildDateOptions() {
  return Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return date;
  });
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function addMinutes(iso: string, minutes: number) {
  const date = new Date(iso);
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function getAddressLabel(business: PublicBusiness) {
  return [business.addressLine1, business.neighborhood, business.city, business.state].filter(Boolean).join(", ");
}

async function resolveSlotsForDate(input: {
  business: PublicBusiness;
  date: string;
  serviceId: string;
  professionalSelection: SelectedProfessional;
}) {
  const professionals =
    input.professionalSelection === "ANY"
      ? input.business.professionals.filter((professional) =>
          professional.services.some((service) => service.serviceId === input.serviceId),
        )
      : input.business.professionals.filter((professional) => professional.id === input.professionalSelection);

  if (professionals.length === 0) return [] as ResolvedSlot[];

  const resolved = await Promise.all(
    professionals.map(async (professional) => {
      const result = await fetchAvailability({
        slug: input.business.slug,
        date: input.date,
        serviceId: input.serviceId,
        professionalId: professional.id,
        timezone: input.business.timezone,
      });

      return result.slots.map((slot) => ({
        ...slot,
        professionalId: professional.id,
        professionalName: professional.displayName,
      }));
    }),
  );

  const merged = new Map<string, ResolvedSlot>();
  for (const collection of resolved) {
    for (const slot of collection) {
      if (!merged.has(slot.startsAt)) {
        merged.set(slot.startsAt, slot);
      }
    }
  }

  return Array.from(merged.values()).sort((left, right) => left.startsAt.localeCompare(right.startsAt));
}

function BookingServiceOption({
  service,
  selected,
  accentColor,
  selectedVariantId,
  onSelect,
  onSelectVariant,
  error,
}: {
  service: PublicBusiness["services"][number];
  selected: boolean;
  accentColor: string;
  selectedVariantId: string | null;
  onSelect: () => void;
  onSelectVariant: (variantId: string) => void;
  error?: string;
}) {
  return (
    <Pressable
      onPress={onSelect}
      style={[
        styles.serviceOption,
        selected && {
          borderColor: accentColor,
          backgroundColor: `${accentColor}12`,
        },
      ]}
    >
      <View style={styles.serviceOptionTop}>
        <View style={styles.radioShell}>{selected ? <Circle size={18} color={accentColor} fill={accentColor} /> : <Circle size={18} color={colors.textMuted} />}</View>
        <View style={styles.serviceOptionCopy}>
          <Text style={styles.serviceOptionName}>{service.name}</Text>
          <Text numberOfLines={2} style={styles.serviceOptionDescription}>
            {service.description || "Servico disponivel para agendamento imediato."}
          </Text>
          <Text style={styles.serviceOptionMeta}>
            {service.durationMinutes} min • {formatCurrency(service.priceCents)}
          </Text>
        </View>
      </View>

      {selected && service.variants.length > 0 ? (
        <View style={styles.variantWrap}>
          <Text style={styles.variantLabel}>Escolha uma variante</Text>
          <View style={styles.variantRow}>
            {service.variants.map((variant) => {
              const active = selectedVariantId === variant.id;
              return (
                <Pressable
                  key={variant.id}
                  onPress={() => onSelectVariant(variant.id)}
                  style={[
                    styles.variantChip,
                    active && {
                      backgroundColor: accentColor,
                      borderColor: accentColor,
                    },
                  ]}
                >
                  <Text style={[styles.variantChipTitle, active && { color: colors.white }]}>{variant.name}</Text>
                  <Text style={[styles.variantChipMeta, active && { color: colors.white }]}>
                    {variant.durationMinutes} min • {formatCurrency(variant.priceCents)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {error ? <Text style={styles.validationText}>{error}</Text> : null}
        </View>
      ) : null}
    </Pressable>
  );
}

function DateChip({
  date,
  selected,
  disabled,
  onPress,
  accentColor,
}: {
  date: Date;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
  accentColor: string;
}) {
  const isToday = toDateKey(date) === toDateKey(new Date());

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.dateChip,
        selected && { backgroundColor: accentColor, borderColor: accentColor },
        disabled && styles.dateChipDisabled,
      ]}
    >
      <Text style={[styles.dateChipTop, selected && styles.dateChipTextActive, disabled && styles.dateChipTextDisabled]}>
        {isToday ? "Hoje" : new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(date)}
      </Text>
      <Text style={[styles.dateChipDay, selected && styles.dateChipTextActive, disabled && styles.dateChipTextDisabled]}>
        {new Intl.DateTimeFormat("pt-BR", { day: "2-digit" }).format(date)}
      </Text>
      <Text style={[styles.dateChipMonth, selected && styles.dateChipTextActive, disabled && styles.dateChipTextDisabled]}>
        {new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(date)}
      </Text>
    </Pressable>
  );
}

function SlotChip({
  label,
  selected,
  onPress,
  accentColor,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  accentColor: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.slotChip,
        selected && { backgroundColor: accentColor, borderColor: accentColor },
      ]}
    >
      <Text style={[styles.slotChipText, selected && styles.slotChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function FormField({
  label,
  value,
  onChangeText,
  keyboardType,
  autoCapitalize,
  error,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "email-address" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  error?: string;
}) {
  return (
    <View style={styles.formField}>
      <Text style={styles.formFieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        placeholder={label}
        placeholderTextColor={colors.textMuted}
        style={[styles.formInput, error && styles.formInputError]}
      />
      {error ? <Text style={styles.validationText}>{error}</Text> : null}
    </View>
  );
}

export function BookingScreen({ route, navigation }: Props) {
  const { slug, serviceId } = route.params;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const slideOffset = useRef(new Animated.Value(0)).current;

  const [business, setBusiness] = useState<PublicBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(serviceId ?? null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selectedProfessional, setSelectedProfessional] = useState<SelectedProfessional>("ANY");
  const [selectedDate, setSelectedDate] = useState(toDateKey(new Date()));
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [profile, setProfile] = useState<SavedProfile>({ name: "", email: "", phone: "" });
  const [saveMyData, setSaveMyData] = useState(true);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const [todayCounts, setTodayCounts] = useState<Record<string, number>>({});
  const [availabilityByDate, setAvailabilityByDate] = useState<Record<string, ResolvedSlot[]>>({});
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const dateOptions = useMemo(() => buildDateOptions(), []);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const [businessData, savedProfile] = await Promise.all([fetchBusiness(slug), loadSavedProfile()]);
        if (!active) return;

        setBusiness(businessData.business);
        setProfile(savedProfile);
        const initialServiceId = serviceId ?? businessData.business.services[0]?.id ?? null;
        setSelectedServiceId(initialServiceId);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Nao foi possivel abrir a reserva.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [serviceId, slug]);

  useEffect(() => {
    Animated.timing(slideOffset, {
      toValue: -(currentStep - 1) * width,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [currentStep, slideOffset, width]);

  const selectedService = useMemo(
    () => business?.services.find((service) => service.id === selectedServiceId) ?? null,
    [business?.services, selectedServiceId],
  );
  const selectedVariant = useMemo(
    () => selectedService?.variants.find((variant) => variant.id === selectedVariantId) ?? null,
    [selectedService?.variants, selectedVariantId],
  );

  const availableProfessionals = useMemo(() => {
    if (!business || !selectedServiceId) return [];
    return business.professionals.filter((professional) =>
      professional.services.some((service) => service.serviceId === selectedServiceId),
    );
  }, [business, selectedServiceId]);

  useEffect(() => {
    if (!selectedService) {
      setSelectedVariantId(null);
      return;
    }

    if (selectedService.variants.length === 0) {
      setSelectedVariantId(null);
      return;
    }

    if (!selectedService.variants.some((variant) => variant.id === selectedVariantId)) {
      setSelectedVariantId(null);
    }
  }, [selectedService, selectedVariantId]);

  useEffect(() => {
    if (selectedProfessional !== "ANY" && !availableProfessionals.some((professional) => professional.id === selectedProfessional)) {
      setSelectedProfessional("ANY");
    }
  }, [availableProfessionals, selectedProfessional]);

  useEffect(() => {
    let active = true;

    async function loadCounts() {
      if (!business || !selectedServiceId || availableProfessionals.length === 0) {
        setTodayCounts({});
        return;
      }

      const today = toDateKey(new Date());
      const entries = await Promise.all(
        availableProfessionals.map(async (professional) => {
          const result = await fetchAvailability({
            slug: business.slug,
            date: today,
            serviceId: selectedServiceId,
            professionalId: professional.id,
            timezone: business.timezone,
          }).catch(() => ({ slots: [] }));

          return [professional.id, result.slots.length] as const;
        }),
      );

      if (!active) return;
      setTodayCounts(Object.fromEntries(entries));
    }

    void loadCounts();
    return () => {
      active = false;
    };
  }, [availableProfessionals, business, selectedServiceId]);

  useEffect(() => {
    let active = true;

    async function loadAvailability() {
      if (!business || !selectedServiceId) {
        setAvailabilityByDate({});
        return;
      }

      try {
        setAvailabilityLoading(true);
        setAvailabilityError(null);

        const entries = await Promise.all(
          dateOptions.map(async (date) => {
            const key = toDateKey(date);
            const slots = await resolveSlotsForDate({
              business,
              date: key,
              serviceId: selectedServiceId,
              professionalSelection: selectedProfessional,
            });
            return [key, slots] as const;
          }),
        );

        if (!active) return;

        const nextMap = Object.fromEntries(entries);
        setAvailabilityByDate(nextMap);
        setSelectedSlot(null);

        if (!nextMap[selectedDate]?.length) {
          const nextDate = dateOptions.find((date) => nextMap[toDateKey(date)]?.length);
          if (nextDate) {
            setSelectedDate(toDateKey(nextDate));
          }
        }
      } catch (loadError) {
        if (!active) return;
        setAvailabilityByDate({});
        setAvailabilityError(loadError instanceof Error ? loadError.message : "Nao foi possivel atualizar os horarios.");
      } finally {
        if (active) setAvailabilityLoading(false);
      }
    }

    void loadAvailability();
    return () => {
      active = false;
    };
  }, [business, dateOptions, selectedDate, selectedProfessional, selectedServiceId]);

  const currentSlots = availabilityByDate[selectedDate] ?? [];
  const selectedSlotEntry = currentSlots.find((slot) => slot.startsAt === selectedSlot) ?? null;
  const activeProfessional =
    selectedProfessional === "ANY"
      ? availableProfessionals.find((professional) => professional.id === selectedSlotEntry?.professionalId) ?? null
      : availableProfessionals.find((professional) => professional.id === selectedProfessional) ?? null;

  const resolvedDuration = selectedVariant?.durationMinutes ?? selectedService?.durationMinutes ?? 0;
  const resolvedPriceCents = selectedVariant?.priceCents ?? selectedService?.priceCents ?? 0;
  const suggestedNextDate = dateOptions.find((date) => {
    const key = toDateKey(date);
    return key !== selectedDate && (availabilityByDate[key]?.length ?? 0) > 0;
  });

  const handleStepChange = async (step: number) => {
    setCurrentStep(step);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleContinue = async () => {
    if (currentStep === 1) {
      if (!selectedService) return;
      if (selectedService.variants.length > 0 && !selectedVariantId) {
        setFormErrors((current) => ({ ...current, variant: "Selecione uma variante para continuar." }));
        return;
      }
      setFormErrors((current) => ({ ...current, variant: undefined }));
      await handleStepChange(2);
      return;
    }

    if (currentStep === 2) {
      await handleStepChange(3);
      return;
    }

    if (currentStep === 3) {
      if (!selectedSlotEntry) return;
      await handleStepChange(4);
      return;
    }
  };

  const handleConfirm = async () => {
    if (!business || !selectedService || !selectedSlotEntry) return;

    const nextErrors: FormErrors = {};
    if (!profile.name.trim()) nextErrors.name = "Informe seu nome completo.";
    if (!profile.phone.trim()) nextErrors.phone = "Informe um telefone para contato.";
    if (profile.email && !/\S+@\S+\.\S+/.test(profile.email)) nextErrors.email = "Digite um e-mail valido.";

    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      setConfirming(true);
      if (saveMyData) {
        await saveProfile(profile);
      }

      const result = await createBooking({
        slug: business.slug,
        serviceId: selectedService.id,
        serviceVariantId: selectedVariantId ?? undefined,
        professionalId: selectedSlotEntry.professionalId,
        startsAt: selectedSlotEntry.startsAt,
        customerName: profile.name.trim(),
        customerEmail: profile.email.trim() || undefined,
        customerPhone: profile.phone.trim(),
        customerTimezone: business.timezone,
      });

      const savedBooking: SavedBooking = {
        appointmentId: result.appointmentId,
        businessSlug: business.slug,
        businessName: business.name,
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        serviceVariantName: selectedVariant?.name,
        professionalName: selectedSlotEntry.professionalName,
        startsAt: result.startsAt,
        durationMinutes: resolvedDuration,
        addressLabel: getAddressLabel(business),
        businessPhone: business.phone ?? undefined,
        businessLogoUrl: business.logoUrl ?? undefined,
        priceCents: resolvedPriceCents,
        status: "CONFIRMED",
        cancelToken: result.cancelToken,
        rescheduleToken: result.rescheduleToken,
      };

      await saveBooking(savedBooking);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.replace("BookingConfirmation", { booking: savedBooking, mode: "confirmed" });
    } catch (confirmError) {
      Alert.alert(
        "Nao foi possivel confirmar",
        confirmError instanceof Error ? confirmError.message : "Tente novamente em alguns instantes.",
      );
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.centerWrap}>
          <ActivityIndicator color={colors.primaryStrong} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !business) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.centerWrap}>
          <ErrorState
            title="Nao foi possivel abrir a reserva"
            body={error || "Tente novamente em alguns instantes."}
            onRetry={() => navigation.replace("Booking", { slug, serviceId })}
          />
        </View>
      </SafeAreaView>
    );
  }

  const footerDisabled =
    currentStep === 1
      ? !selectedService || (selectedService.variants.length > 0 && !selectedVariantId)
      : currentStep === 2
        ? availableProfessionals.length === 0
        : currentStep === 3
          ? !selectedSlotEntry || availabilityLoading
          : confirming;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Finalizar reserva</Text>
          <Text style={styles.subtitle}>Escolha servico, profissional, horario e confirme seus dados.</Text>
          <StepIndicator currentStep={currentStep} labels={stepLabels} accentColor={business.brandPrimaryColor || colors.primaryStrong} />
        </View>

        <Animated.View
          style={[
            styles.stepsTrack,
            {
              width: width * 4,
              transform: [{ translateX: slideOffset }],
            },
          ]}
        >
          <View style={[styles.stepPane, { width }]}>
            <ScrollView contentContainerStyle={styles.stepScroll}>
              {business.services.map((service) => (
                <BookingServiceOption
                  key={service.id}
                  service={service}
                  selected={selectedServiceId === service.id}
                  accentColor={business.brandPrimaryColor || colors.primaryStrong}
                  selectedVariantId={selectedVariantId}
                  onSelect={() => {
                    setSelectedServiceId(service.id);
                    setSelectedVariantId(null);
                    setFormErrors((current) => ({ ...current, variant: undefined }));
                  }}
                  onSelectVariant={setSelectedVariantId}
                  error={selectedServiceId === service.id ? formErrors.variant : undefined}
                />
              ))}
            </ScrollView>
          </View>

          <View style={[styles.stepPane, { width }]}>
            <ScrollView contentContainerStyle={styles.stepScroll}>
              <ProfessionalCard
                displayName="Qualquer profissional"
                roleLabel="Escolhemos o melhor horario disponivel"
                photoUrl={null}
                selected={selectedProfessional === "ANY"}
                accentColor={business.brandPrimaryColor || colors.primaryStrong}
                availabilityLabel={`${Object.values(todayCounts).reduce((sum, value) => sum + value, 0)} horarios hoje`}
                compact
                onPress={() => setSelectedProfessional("ANY")}
              />
              <View style={styles.professionalColumn}>
                {availableProfessionals.map((professional) => (
                  <ProfessionalCard
                    key={professional.id}
                    displayName={professional.displayName}
                    roleLabel={professional.roleLabel}
                    photoUrl={professional.photoUrl}
                    selected={selectedProfessional === professional.id}
                    accentColor={business.brandPrimaryColor || colors.primaryStrong}
                    availabilityLabel={`${todayCounts[professional.id] ?? 0} horarios hoje`}
                    compact
                    onPress={() => setSelectedProfessional(professional.id)}
                  />
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={[styles.stepPane, { width }]}>
            <ScrollView contentContainerStyle={styles.stepScroll}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
                {dateOptions.map((date) => {
                  const key = toDateKey(date);
                  return (
                    <DateChip
                      key={key}
                      date={date}
                      selected={key === selectedDate}
                      disabled={availabilityLoading ? true : (availabilityByDate[key]?.length ?? 0) === 0}
                      onPress={() => {
                        setSelectedDate(key);
                        setSelectedSlot(null);
                      }}
                      accentColor={business.brandPrimaryColor || colors.primaryStrong}
                    />
                  );
                })}
              </ScrollView>

              {availabilityLoading ? (
                <View style={styles.loadingInline}>
                  <ActivityIndicator color={business.brandPrimaryColor || colors.primaryStrong} />
                  <Text style={styles.loadingInlineText}>Buscando horarios livres...</Text>
                </View>
              ) : availabilityError ? (
                <ErrorState
                  title="Sem conexao com a agenda"
                  body={availabilityError}
                  onRetry={() => {
                    setSelectedDate((current) => current);
                  }}
                />
              ) : currentSlots.length === 0 ? (
                <View style={styles.emptyInlineCard}>
                  <Text style={styles.emptyInlineTitle}>Sem horarios para este dia</Text>
                  <Text style={styles.emptyInlineBody}>
                    {suggestedNextDate
                      ? `Tente ${new Intl.DateTimeFormat("pt-BR", {
                          weekday: "long",
                          day: "2-digit",
                          month: "long",
                        }).format(suggestedNextDate)}.`
                      : "Escolha outro profissional ou volte mais tarde."}
                  </Text>
                </View>
              ) : (
                <>
                  <View style={styles.slotGrid}>
                    {currentSlots.map((slot) => (
                      <SlotChip
                        key={slot.startsAt}
                        label={slot.label}
                        selected={selectedSlot === slot.startsAt}
                        onPress={() => setSelectedSlot(slot.startsAt)}
                        accentColor={business.brandPrimaryColor || colors.primaryStrong}
                      />
                    ))}
                  </View>
                  {selectedSlotEntry ? (
                    <Text style={styles.durationText}>
                      Duracao: {resolvedDuration} min · Termino as{" "}
                      {new Intl.DateTimeFormat("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(addMinutes(selectedSlotEntry.startsAt, resolvedDuration))}
                    </Text>
                  ) : null}
                </>
              )}
            </ScrollView>
          </View>

          <View style={[styles.stepPane, { width }]}>
            <ScrollView contentContainerStyle={styles.stepScroll}>
              <View style={[styles.summaryCard, { backgroundColor: `${business.brandPrimaryColor || colors.primaryStrong}10` }]}>
                <Text style={styles.summaryBusiness}>{business.name}</Text>
                <Text style={styles.summaryLine}>{selectedService?.name}</Text>
                {selectedVariant?.name ? <Text style={styles.summaryLine}>{selectedVariant.name}</Text> : null}
                <Text style={styles.summaryLine}>
                  {selectedSlotEntry?.professionalName || activeProfessional?.displayName || "Qualquer profissional"}
                </Text>
                {selectedSlotEntry ? <Text style={styles.summaryLine}>{formatDateTime(selectedSlotEntry.startsAt)}</Text> : null}
                <Text style={styles.summaryPrice}>{formatCurrency(resolvedPriceCents)}</Text>
                {getAddressLabel(business) ? <Text style={styles.summaryAddress}>{getAddressLabel(business)}</Text> : null}
              </View>

              <FormField
                label="Seu nome completo"
                value={profile.name}
                onChangeText={(value) => setProfile((current) => ({ ...current, name: value }))}
                autoCapitalize="words"
                error={formErrors.name}
              />
              <FormField
                label="E-mail"
                value={profile.email}
                onChangeText={(value) => setProfile((current) => ({ ...current, email: value }))}
                keyboardType="email-address"
                autoCapitalize="none"
                error={formErrors.email}
              />
              <FormField
                label="Telefone"
                value={profile.phone}
                onChangeText={(value) => setProfile((current) => ({ ...current, phone: value }))}
                keyboardType="phone-pad"
                error={formErrors.phone}
              />

              <Pressable style={styles.checkboxRow} onPress={() => setSaveMyData((value) => !value)}>
                <View
                  style={[
                    styles.checkbox,
                    saveMyData && { backgroundColor: business.brandPrimaryColor || colors.primaryStrong, borderColor: business.brandPrimaryColor || colors.primaryStrong },
                  ]}
                >
                  {saveMyData ? <Check size={14} color={colors.white} /> : null}
                </View>
                <Text style={styles.checkboxLabel}>Salvar meus dados para proximas reservas</Text>
              </Pressable>
            </ScrollView>
          </View>
        </Animated.View>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          {currentStep > 1 ? (
            <Pressable style={styles.backSecondaryButton} onPress={() => void handleStepChange(currentStep - 1)}>
              <Text style={styles.backSecondaryButtonLabel}>Voltar</Text>
            </Pressable>
          ) : (
            <View style={styles.backSecondarySpacer} />
          )}

          {currentStep < 4 ? (
            <Pressable
              style={[
                styles.primaryButton,
                footerDisabled && styles.primaryButtonDisabled,
                { backgroundColor: footerDisabled ? colors.textMuted : business.brandPrimaryColor || colors.primaryStrong },
              ]}
              disabled={footerDisabled}
              onPress={() => void handleContinue()}
            >
              <Text style={styles.primaryButtonLabel}>Continuar</Text>
              <MoveRight size={16} color={colors.white} />
            </Pressable>
          ) : (
            <Pressable
              style={[
                styles.primaryButton,
                { backgroundColor: confirming ? colors.textMuted : business.brandPrimaryColor || colors.primaryStrong },
              ]}
              disabled={confirming}
              onPress={() => void handleConfirm()}
            >
              {confirming ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryButtonLabel}>Confirmar reserva</Text>}
            </Pressable>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.backgroundSoft,
  },
  container: {
    flex: 1,
  },
  centerWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    color: colors.textDark,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
  },
  subtitle: {
    color: colors.textSoft,
    fontSize: 14,
    lineHeight: 21,
  },
  stepsTrack: {
    flex: 1,
    flexDirection: "row",
  },
  stepPane: {
    flex: 1,
  },
  stepScroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  serviceOption: {
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceCard,
    padding: spacing.lg,
    ...shadows.card,
  },
  serviceOptionTop: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start",
  },
  radioShell: {
    paddingTop: 2,
  },
  serviceOptionCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  serviceOptionName: {
    color: colors.textDark,
    fontSize: 18,
    fontWeight: "800",
  },
  serviceOptionDescription: {
    color: colors.textSoft,
    fontSize: 14,
    lineHeight: 21,
  },
  serviceOptionMeta: {
    color: colors.textDark,
    fontSize: 14,
    fontWeight: "700",
  },
  variantWrap: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  variantLabel: {
    color: colors.textDark,
    fontSize: 13,
    fontWeight: "800",
  },
  variantRow: {
    gap: spacing.sm,
  },
  variantChip: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  variantChipTitle: {
    color: colors.textDark,
    fontSize: 14,
    fontWeight: "800",
  },
  variantChipMeta: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  validationText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "700",
  },
  professionalColumn: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  dateRow: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  dateChip: {
    width: 78,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceCard,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    ...shadows.card,
  },
  dateChipDisabled: {
    backgroundColor: colors.surfaceMuted,
  },
  dateChipTop: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  dateChipDay: {
    color: colors.textDark,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 2,
  },
  dateChipMonth: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  dateChipTextActive: {
    color: colors.white,
  },
  dateChipTextDisabled: {
    color: colors.textMuted,
  },
  loadingInline: {
    minHeight: 120,
    borderRadius: radii.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceCard,
    ...shadows.card,
  },
  loadingInlineText: {
    color: colors.textSoft,
    fontSize: 14,
    fontWeight: "700",
  },
  emptyInlineCard: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    backgroundColor: colors.surfaceCard,
    gap: spacing.xs,
    ...shadows.card,
  },
  emptyInlineTitle: {
    color: colors.textDark,
    fontSize: 18,
    fontWeight: "800",
  },
  emptyInlineBody: {
    color: colors.textSoft,
    fontSize: 14,
    lineHeight: 21,
  },
  slotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  slotChip: {
    width: "31%",
    minHeight: 48,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceCard,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.card,
  },
  slotChipText: {
    color: colors.textDark,
    fontSize: 14,
    fontWeight: "800",
  },
  slotChipTextActive: {
    color: colors.white,
  },
  durationText: {
    color: colors.textSoft,
    fontSize: 14,
    fontWeight: "700",
    marginTop: spacing.md,
  },
  summaryCard: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  summaryBusiness: {
    color: colors.textDark,
    fontSize: 18,
    fontWeight: "800",
  },
  summaryLine: {
    color: colors.textSoft,
    fontSize: 14,
    lineHeight: 20,
  },
  summaryPrice: {
    color: colors.textDark,
    fontSize: 24,
    fontWeight: "900",
    marginTop: spacing.sm,
  },
  summaryAddress: {
    color: colors.textSoft,
    fontSize: 13,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  formField: {
    gap: 8,
  },
  formFieldLabel: {
    color: colors.textDark,
    fontSize: 14,
    fontWeight: "700",
  },
  formInput: {
    minHeight: 54,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    color: colors.textDark,
    fontSize: 15,
  },
  formInputError: {
    borderColor: colors.danger,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceCard,
  },
  checkboxLabel: {
    flex: 1,
    color: colors.textDark,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surfaceCard,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.card,
  },
  backSecondaryButton: {
    minHeight: 54,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
  backSecondaryButtonLabel: {
    color: colors.textDark,
    fontSize: 14,
    fontWeight: "800",
  },
  backSecondarySpacer: {
    width: 92,
  },
  primaryButton: {
    flex: 1,
    minHeight: 56,
    borderRadius: radii.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  primaryButtonDisabled: {
    backgroundColor: colors.textMuted,
  },
  primaryButtonLabel: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "800",
  },
});
