"use client";
import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { ClipLoader } from "react-spinners";
import { useModal } from "../../../../hooks/useModal";
import Request from "../../../../utils/request";
import PageBreadcrumb from "../../../../components/common/PageBreadCrumb";
import Button from "../../../../components/ui/button/Button";
import { Modal } from "../../../../components/ui/modal";
import Label from "../../../../components/form/Label";
import Input from "../../../../components/form/input/InputField";
import {
  IconServer,
  IconWallet,
  IconCalendarTime,
  IconLink,
  IconSettingsAutomation,
  IconCoin,
} from "@tabler/icons-react";
import Select from "../../../../components/form/Select";
import Switch from "../../../../components/form/switch/Switch";
import mt5 from '../../../../icons/mt5.png';
import Image from "next/image";
import cTraderIcon from "../../../../icons/ctrader.png";

interface Account {
  accountNumber: string;
  server: string;
  platform: string;
  balance: number;
  depositCurrency: string;
  isActive: boolean;
  creditExpiryTime: string | null;
  masterAccountID: string | null;
  role: "Master" | "Slave" | null;
  createdAt: string;
  autoRenew?: boolean;
}

export default function TradeManagerPage() {
  const { isOpen, openModal, closeModal } = useModal();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [actionType, setActionType] = useState<"activate" | "addCredits" | "replace" | null>(null);
  const [formData, setFormData] = useState({
    credits: 1,
    newAccountNumber: "",
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showReplaceDropdown, setShowReplaceDropdown] = useState(false);
  const replaceDropdownRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const accountsRes = await Request({
        method: "GET",
        url: "trading-accounts",
      });
      if (Array.isArray(accountsRes)) {
        setAccounts(accountsRes);
      }

      const balanceRes = await Request({
        method: "GET",
        url: "manage-credit/balance",
      });
      if (balanceRes?.balance !== undefined) {
        setBalance(balanceRes.balance);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load information.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (replaceDropdownRef.current && !replaceDropdownRef.current.contains(e.target as Node)) {
        setShowReplaceDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  useEffect(() => {
    fetchData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: name === "credits" ? parseInt(value) || 1 : value }));
    setErrors((prev: any) => ({ ...prev, [name]: undefined }));
  };

  const handleSelectChange = (fieldName: string, value: string) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
    setErrors((prev: any) => ({ ...prev, [fieldName]: undefined }));
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    if (actionType === "activate" || actionType === "addCredits") {
      if (formData.credits < 1 || formData.credits > 12) {
        newErrors.credits = "Credits must be between 1 and 12";
      }
    }
    if (actionType === "replace" && !formData.newAccountNumber) {
      newErrors.newAccountNumber = "New account is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount || !validateForm()) return;

    setActionLoading(true);
    try {
      let response;
      const body: any = {};
      if (actionType === "activate" || actionType === "addCredits") {
        body.credits = formData.credits;
      }
      if (actionType === "activate") {
        body.accountNumber = selectedAccount.accountNumber;
        response = await Request({
          method: "POST",
          url: "manage-account/create-account-manager",
          data: body,
        });
      } else if (actionType === "addCredits") {
        body.accountNumber = selectedAccount.accountNumber;
        response = await Request({
          method: "POST",
          url: "manage-account/assign-account-credits",
          data: body,
        });
      } else if (actionType === "replace") {
        body.oldAccountNumber = selectedAccount.accountNumber;
        body.newAccountNumber = formData.newAccountNumber;
        response = await Request({
          method: "POST",
          url: "manage-account/replace-account-manager",
          data: body,
        });
      }

      if (response) {
        toast.success("Action completed successfully");
        fetchData();
        closeModal();
      }
    } catch (error) {
      console.error("Error performing action:", error);
      toast.error("Failed to perform action. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetAutoRenew = async (accountNumber: string, autoRenew: boolean) => {
    try {
      const response = await Request({
        method: "POST",
        url: "manage-account/set-account-auto-renew",
        data: { accountNumber, autoRenew },
      });
      if (response) {
        toast.success("Auto-renew updated");
        setAccounts((prev) =>
          prev.map((acc) => (acc.accountNumber === accountNumber ? { ...acc, autoRenew } : acc))
        );
      }
    } catch (error) {
      console.error("Error setting auto-renew:", error);
      toast.error("Failed to update auto-renew.");
    }
  };

  const openActionModal = (account: Account, type: "activate" | "addCredits" | "replace") => {
    setSelectedAccount(account);
    setActionType(type);
    setFormData({
      credits: 1,
      newAccountNumber: "",
    });
    openModal();
  };

  const getInactiveAccounts = () => {
    return accounts.filter(
      (acc) => !acc.isActive && acc.platform === "MT5" && acc.accountNumber !== selectedAccount?.accountNumber
    );
  };

  const formatDate = (date: string | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  const formatCurrency = (amount: number) => `${amount.toLocaleString()}`;

  const getStatusColor = (isActive: boolean) => {
    return isActive
      ? "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400"
      : "text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400";
  };

  // Desktop Skeleton
  const SkeletonLoader = () => (
    <div className="overflow-x-auto">
      <table className="w-full table-auto min-w-[1200px]">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-800">
            <th className="px-4 py-3 text-left">Account Number</th>
            <th className="px-4 py-3 text-left">Server</th>
            <th className="px-4 py-3 text-left">Balance</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-left">Expiry</th>
            <th className="px-4 py-3 text-left">Role</th>
            <th className="px-4 py-3 text-left">Master</th>
            <th className="px-4 py-3 text-left">Auto Renew</th>
            <th className="px-4 py-3 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {[...Array(3)].map((_, i) => (
            <tr key={i} className="border-b border-gray-200 dark:border-gray-800">
              {[...Array(9)].map((_, j) => (
                <td key={j} className="px-4 py-3">
                  <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Mobile Account Card
  const MobileAccountCard = ({ account }: { account: Account }) => {
    const role = account?.isActive ? (account.masterAccountID ? "Slave" : "Master") : "—";

    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div>
              <div className="font-semibold text-xl text-gray-900 dark:text-white">
                {account.accountNumber}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {account.server}
              </div>
            </div>
            <Image
              src={account.platform === "MT5" ? mt5 : cTraderIcon}
              alt="Platform"
              width={28}
              height={28}
              className="mt-1"
            />
          </div>
          <span className={`px-4 py-1.5 rounded-2xl text-xs font-medium ${getStatusColor(account.isActive)}`}>
            {account.isActive ? "Active" : "Inactive"}
          </span>
        </div>

        <div className="mb-6">
          <div className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1">Balance</div>
          <div className="text-2xl font-semibold text-gray-800 dark:text-white">
            {formatCurrency(account.balance)} {account.depositCurrency}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <div className="text-xs uppercase tracking-widest text-gray-700 dark:text-gray-300 mb-1">Expiry</div>
            <div className="font-medium text-gray-700 dark:text-gray-300">
              {account.creditExpiryTime ? formatDate(account.creditExpiryTime) : "—"}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-gray-700 dark:text-gray-300 mb-1">Role</div>
            <div className="font-medium text-gray-700 dark:text-gray-300">{role}</div>
          </div>
        </div>

        <div className="mb-6">
          <div className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1">Master ID</div>
          <div className="font-medium text-gray-800 dark:text-white">
            {account.masterAccountID || "—"}
          </div>
        </div>

        {account.isActive && (
          <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-100 dark:border-gray-800">
            <div>
              <div className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400">Auto Renew</div>
            </div>
            <Switch
              label=""
              defaultChecked={account.autoRenew ?? false}
              onChange={(checked) => handleSetAutoRenew(account.accountNumber, checked)}
            />
          </div>
        )}

        <div className="flex gap-3">
          {!account.isActive ? (
            <Button
              size="sm"
              className="flex-1"
              onClick={() => openActionModal(account, "activate")}
            >
              Activate Account
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                className="flex-1"
                onClick={() => openActionModal(account, "addCredits")}
              >
                Add Credits
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => openActionModal(account, "replace")}
              >
                Replace
              </Button>
            </>
          )}
        </div>
      </div>
    );
  };

  // Mobile Skeleton Card
  const MobileSkeletonCard = () => (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 space-y-6">
      <div className="flex justify-between">
        <div className="space-y-3">
          <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
        </div>
        <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse"></div>
      </div>

      <div className="h-9 w-56 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse"></div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <div className="h-3 w-14 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
        <div className="space-y-2">
          <div className="h-3 w-14 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-5 w-28 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>

      <div className="flex gap-3 pt-4">
        <div className="h-11 flex-1 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse"></div>
        <div className="h-11 flex-1 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse"></div>
      </div>
    </div>
  );

  return (
    <div className="relative z-20">
      <PageBreadcrumb pageTitle="Trade Manager" />
      <div className="min-h-screen   w-full  md:max-w-[77.5vw] rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
        {/* Header */}
        <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 flex items-center">
            Manage Your Trade Accounts
          </h3>
          <div className="text-left md:text-right w-full md:w-auto">
            <p className="text-sm text-gray-600 dark:text-gray-400">Available Credits</p>
            <p className="text-3xl font-bold text-gray-800 dark:text-white/90 flex items-center justify-start md:justify-end gap-2">
              <IconCoin size={28} className="text-amber-600" />
              {balance} Credits
            </p>
          </div>
        </div>

        {/* Explanation Section */}
        <div className="mb-10 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 border border-indigo-100 dark:border-indigo-800/60 rounded-3xl p-8">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="shrink-0 p-4 bg-white dark:bg-gray-900 rounded-2xl shadow-sm mx-auto md:mx-0">
              <IconSettingsAutomation size={48} className="text-indigo-600 dark:text-indigo-500" />
            </div>
            <div className="space-y-4 w-full">
              <div>
                <h4 className="text-2xl font-semibold text-gray-900 dark:text-white text-center md:text-left">
                  How The Functionality Works
                </h4>
                <p className="mt-2 text-gray-600 dark:text-gray-400 leading-relaxed max-w-3xl text-center md:text-left">
                  Activate your trading accounts with credits to unlock advanced management features. Real-time trade analysis, Master accounts operate independently, while Slave accounts automatically copy trades from a designated Master. Each credit provides 30 days of activation.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                <div className="flex gap-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-xl">
                    <IconServer size={24} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800 dark:text-white">Dedicated Server</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Automated instance for your account</div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl">
                    <IconCalendarTime size={24} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800 dark:text-white">Credit-Based Activation</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Flexible 30-day periods</div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 pt-3 text-center md:text-left">
                ✨ Activate accounts, assign roles, and manage renewals professionally
              </p>
            </div>
          </div>
        </div>

        {/* Accounts Section */}
        <div className="mt-10">
          {loading ? (
            <>
              {/* Desktop Table Skeleton */}
              <div className="hidden md:block">
                <SkeletonLoader />
              </div>

              {/* Mobile Card Skeletons */}
              <div className="md:hidden space-y-6">
                {[...Array(3)].map((_, i) => (
                  <MobileSkeletonCard key={i} />
                ))}
              </div>
            </>
          ) : accounts.length === 0 ? (
            <div className="py-12 text-center text-gray-500 dark:text-gray-400 border border-dashed border-gray-200 dark:border-gray-800 rounded-3xl">
              No accounts found. Add accounts in the Accounts section.
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full table-auto min-w-[1200px]">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-800">
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">Account Number</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">Server</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">Balance</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">Expiry</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">Role</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">Master ID</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">Auto Renew</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((account) => {
                      const role = account?.isActive ? (account.masterAccountID ? "Slave" : "Master") : "—";
                      return (
                        <tr key={account.accountNumber} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5">
                          <td className="px-4 py-4 text-sm font-medium text-gray-800 dark:text-white">
                            <div className="flex items-center gap-2">
                              <span>{account.accountNumber}</span>
                              <Image
                                src={account?.platform === "MT5" ? mt5 : cTraderIcon}
                                alt="Logo"
                                width={20}
                                height={20}
                              />
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">{account.server}</td>
                          <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                            {formatCurrency(account.balance)} {account.depositCurrency}
                          </td>
                          <td className="px-4 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(account.isActive)}`}>
                              {account.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                            {account?.creditExpiryTime ? formatDate(account.creditExpiryTime) : "—"}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">{role}</td>
                          <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                            {account.masterAccountID || "—"}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                            {account.isActive ? (
                              <Switch
                                label=""
                                defaultChecked={account.autoRenew ?? false}
                                onChange={(checked) => handleSetAutoRenew(account.accountNumber, checked)}
                              />
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-4 py-4 flex gap-2">
                            {!account.isActive ? (
                              <Button size="xs" onClick={() => openActionModal(account, "activate")}>
                                Activate
                              </Button>
                            ) : (
                              <>
                                <Button size="xs" onClick={() => openActionModal(account, "addCredits")}>
                                  Add Credits
                                </Button>
                                <Button size="xs" variant="outline" onClick={() => openActionModal(account, "replace")}>
                                  Replace
                                </Button>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-6">
                {accounts.map((account) => (
                  <MobileAccountCard key={account.accountNumber} account={account} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Action Modal */}
      {/* Action Modal */}
      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        className="max-w-md w-[92vw] max-h-[95vh] mx-4 my-4 sm:my-8"
      >
        <div className="bg-white dark:bg-gray-900 rounded-3xl overflow-hidden">
          <div className="p-6 max-h-[95vh] overflow-y-auto">
            <h4 className="text-xl font-semibold mb-5 text-gray-800 dark:text-white/90">
              {actionType === "activate"
                ? "Activate Account"
                : actionType === "addCredits"
                  ? "Add Credits"
                  : "Replace Account"}
            </h4>

            {selectedAccount && (
              <form onSubmit={handleSubmit}>
                <p className="mb-5 flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <span>Account:</span>
                  <strong className="text-gray-900 dark:text-white">{selectedAccount.accountNumber}</strong>
                  <Image
                    src={selectedAccount.platform === "MT5" ? mt5 : cTraderIcon}
                    alt="Logo"
                    width={25}
                    height={25}
                  />
                </p>

                {actionType === "replace" && (
                  <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm leading-relaxed">
                    The active status, credit expiry time, auto renew setting, and role will be transferred to the new account. Master account ID will be transferred if applicable.
                  </p>
                )}

                {/* Custom Dropdown for Replace Account */}
                {actionType === "replace" && (
                  <div className="mb-8">
                    <Label>New Account</Label>
                    <div ref={replaceDropdownRef} className="relative mt-1.5">
                      {/* Dropdown Trigger */}
                      <button
                        type="button"
                        onClick={() => setShowReplaceDropdown(!showReplaceDropdown)}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-indigo-400 focus:border-indigo-500 transition-all"
                      >
                        {formData.newAccountNumber ? (
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
                              <Image
                                src={
                                  getInactiveAccounts().find(
                                    (acc) => acc.accountNumber === formData.newAccountNumber
                                  )?.platform === "MT5"
                                    ? mt5
                                    : cTraderIcon
                                }
                                alt="Platform"
                                width={24}
                                height={24}
                                className="object-contain"
                              />
                            </div>
                            <div>
                              <div className="font-semibold text-left text-gray-900 dark:text-white">
                                {formData.newAccountNumber}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {
                                  getInactiveAccounts().find(
                                    (acc) => acc.accountNumber === formData.newAccountNumber
                                  )?.server
                                } • {getInactiveAccounts().find(
                                    (acc) => acc.accountNumber === formData.newAccountNumber
                                  )?.balance}&nbsp;
                                 {getInactiveAccounts().find(
                                    (acc) => acc.accountNumber === formData.newAccountNumber
                                  )?.depositCurrency}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">Select inactive account</span>
                        )}

                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className={`w-5 h-5 text-gray-400 transition-transform ${showReplaceDropdown ? "rotate-180" : ""}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {/* Dropdown List */}
                      {showReplaceDropdown && (
                        <div className="absolute z-50 mt-2 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl overflow-hidden max-h-[260px] overflow-y-auto">
                          {getInactiveAccounts().length === 0 ? (
                            <div className="p-4 text-sm text-gray-500">No inactive accounts available</div>
                          ) : (
                            getInactiveAccounts().map((acc) => (
                              <button
                                key={acc.accountNumber}
                                type="button"
                                onClick={() => {
                                  handleSelectChange("newAccountNumber", acc.accountNumber);
                                  setShowReplaceDropdown(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${formData.newAccountNumber === acc.accountNumber ? "bg-indigo-50 dark:bg-indigo-950/50" : ""}`}
                              >
                                <div className="w-9 h-9 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-xl">
                                  <Image
                                    src={acc.platform === "MT5" ? mt5 : cTraderIcon}
                                    alt={acc.platform}
                                    width={28}
                                    height={28}
                                    className="object-contain"
                                  />
                                </div>
                                <div className="text-left">
                                  <div className="font-medium text-gray-900 dark:text-white">
                                    {acc.accountNumber}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {acc.server} • {acc.balance ? `${acc.balance}` : ""} {acc.depositCurrency}
                                  </div>
                                </div>
                                {formData.newAccountNumber === acc.accountNumber && (
                                  <div className="ml-auto w-2 h-2 bg-indigo-500 rounded-full"></div>
                                )}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    {errors.newAccountNumber && (
                      <p className="mt-1 text-sm text-red-500">{errors.newAccountNumber}</p>
                    )}
                  </div>
                )}

                {/* Credits Section */}
                {(actionType === "activate" || actionType === "addCredits") && (
                  <div className="mb-8">
                    <Label>Credits (1 credit = 30 days)</Label>
                    <Input
                      type="number"
                      name="credits"
                      value={formData.credits}
                      onChange={handleInputChange}
                      min={1}
                      max={12}
                      placeholder="Enter number of credits"
                      className={`mt-1.5 ${errors.credits ? "border-red-500" : ""}`}
                    />
                    {errors.credits && (
                      <p className="mt-1 text-sm text-red-500">{errors.credits}</p>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <Button variant="outline" size="sm" onClick={closeModal} disabled={actionLoading}>
                    Cancel
                  </Button>
                  <Button size="sm" type="submit" disabled={actionLoading}>
                    {actionLoading ? <ClipLoader color="#ffffff" size={20} /> : "Confirm"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}