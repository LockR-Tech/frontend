import { useState } from "react";
import {
  useGetPartnerProfileQuery,
  useUpdatePartnerProfileMutation,
} from "@/stores/apis/partnerApi";

export interface PartnerProfile {
  businessName: string;
  contactPhone: string;
  businessAddress: string;
}

export function useSettings() {
  const {
    data: profileData,
    isLoading,
    error,
    refetch,
  } = useGetPartnerProfileQuery();

  const [updateProfile, { isLoading: isUpdating }] =
    useUpdatePartnerProfileMutation();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Map API response to form data
  const profile: PartnerProfile | null = profileData
    ? {
        businessName: profileData.businessName || "",
        contactPhone: profileData.contactPhone || "",
        businessAddress: profileData.businessAddress || "",
      }
    : null;

  const handleUpdate = async (data: {
    businessName: string;
    phone: string;
    address: string;
  }) => {
    try {
      await updateProfile({
        businessName: data.businessName,
        contactPhone: data.phone,
        businessAddress: data.address,
      }).unwrap();
      setSuccessMessage("Cập nhật thành công!");
      setTimeout(() => setSuccessMessage(null), 3000);
      return true;
    } catch (error) {
      console.error("Failed to update profile:", error);
      return false;
    }
  };

  return {
    profile,
    isLoading,
    error,
    refetch,
    handleUpdate,
    isUpdating,
    successMessage,
  };
}
