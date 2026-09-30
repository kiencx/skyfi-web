"use client";

import { useEffect, useMemo, useState } from 'react';
import { fetchBssPackagePrice, getRequestErrorMessage } from '@/app/utils/bssCatalog';

export const BSS_MAX_QUANTITY = 50;

// data_amount = 0 means unlimited data.
const getDataOption = (pkg) => {
  const amount = Number(pkg?.data_amount);
  if (pkg?.data_amount == null || !Number.isFinite(amount)) return null;
  const unit = String(pkg.data_unit || '').toUpperCase();
  return {
    key: `${amount}-${unit}`,
    amount,
    unit,
    sortValue: unit === 'GB' ? amount * 1024 : amount,
  };
};

const getValidityDays = (pkg) => {
  const days = Number(pkg?.validity_days);
  return Number.isFinite(days) ? days : null;
};

/**
 * Selection state for BSS v2 packages: data -> validity days -> package ->
 * quantity. Price always comes from the server (`/packages/{id}/price`).
 */
export default function useBssPackageSelection({ packages, brand }) {
  const [selectedDataKey, setSelectedDataKey] = useState('');
  const [selectedDays, setSelectedDays] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(null);
  const [priceError, setPriceError] = useState('');
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);

  const dataChoices = useMemo(() => {
    const byKey = new Map(packages.map(getDataOption).filter(Boolean).map((option) => [option.key, option]));
    return [...byKey.values()].sort((left, right) => left.sortValue - right.sortValue);
  }, [packages]);

  const validityChoices = useMemo(() => (
    [...new Set(packages.map(getValidityDays).filter((days) => days !== null))].sort((a, b) => a - b)
  ), [packages]);

  // Only validity days that have a package for the selected data amount can be picked.
  const availableDays = useMemo(() => new Set(
    packages
      .filter((pkg) => getDataOption(pkg)?.key === selectedDataKey)
      .map(getValidityDays)
      .filter((days) => days !== null),
  ), [packages, selectedDataKey]);

  const suggestedPackages = useMemo(() => packages.filter((pkg) => (
    getDataOption(pkg)?.key === selectedDataKey && String(getValidityDays(pkg)) === selectedDays
  )), [packages, selectedDataKey, selectedDays]);

  const selectedPackage = useMemo(
    () => suggestedPackages.find((pkg) => String(pkg.package_id) === String(selectedPackageId)) || null,
    [suggestedPackages, selectedPackageId],
  );

  useEffect(() => {
    if (dataChoices.length && !dataChoices.some((option) => option.key === selectedDataKey)) {
      setSelectedDataKey(dataChoices[0].key);
    }
  }, [dataChoices, selectedDataKey]);

  useEffect(() => {
    if (!availableDays.has(Number(selectedDays))) {
      const firstAvailable = validityChoices.find((days) => availableDays.has(days));
      setSelectedDays(firstAvailable === undefined ? '' : String(firstAvailable));
    }
  }, [availableDays, selectedDays, validityChoices]);

  useEffect(() => {
    setSelectedPackageId('');
    setQuantity(1);
  }, [selectedDataKey, selectedDays]);

  useEffect(() => {
    if (!selectedPackage || !Number.isInteger(quantity) || quantity < 1) {
      setPrice(null);
      setPriceError('');
      return undefined;
    }

    let isCurrent = true;
    setIsLoadingPrice(true);
    setPriceError('');
    fetchBssPackagePrice({ packageId: selectedPackage.package_id, quantity, brand })
      .then((data) => { if (isCurrent) setPrice(data); })
      .catch((error) => {
        if (isCurrent) {
          setPrice(null);
          setPriceError(getRequestErrorMessage(error, 'Không thể kiểm tra giá gói.'));
        }
      })
      .finally(() => { if (isCurrent) setIsLoadingPrice(false); });
    return () => { isCurrent = false; };
  }, [quantity, selectedPackage, brand]);

  const changeQuantity = (delta) => setQuantity((current) => (
    Math.min(BSS_MAX_QUANTITY, Math.max(1, (Number(current) || 1) + delta))
  ));

  const setQuantityFromInput = (rawValue) => {
    if (rawValue !== '' && !/^\d+$/.test(rawValue)) return;
    if (Number(rawValue) > BSS_MAX_QUANTITY) {
      setQuantity(BSS_MAX_QUANTITY);
      return;
    }
    setQuantity(rawValue === '' ? '' : Number(rawValue));
  };

  const normalizeQuantity = () => {
    if (quantity === '' || Number.isNaN(Number(quantity)) || Number(quantity) < 1) {
      setQuantity(1);
    }
  };

  return {
    dataChoices,
    validityChoices,
    availableDays,
    suggestedPackages,
    selectedDataKey,
    selectedDays,
    selectedPackage,
    selectedPackageId,
    quantity,
    price,
    priceError,
    isLoadingPrice,
    selectData: setSelectedDataKey,
    selectDays: (days) => setSelectedDays(String(days)),
    selectPackage: (id) => setSelectedPackageId(String(id)),
    changeQuantity,
    setQuantityFromInput,
    normalizeQuantity,
  };
}
