"use client";
import React, { useState, useEffect } from "react";
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
  autoRenew?: boolean; // Assuming this field is returned in API
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

  const formatCurrency = (amount: number) => `$${amount.toLocaleString()}`;

  const getStatusColor = (isActive: boolean) => {
    return isActive
      ? "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400"
      : "text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400";
  };

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

  return (
    <div className="relative z-20">
      <PageBreadcrumb pageTitle="Trade Manager" />
      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
        {/* Header */}
        <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 flex items-center">Manage Your Trade Accounts
          </h3>
          <div className="text-left md:text-right w-full md:w-auto">
            <p className="text-sm text-gray-600 dark:text-gray-400">Available Credits</p>
            <p className="text-3xl font-bold text-gray-800 dark:text-white/90 flex items-center justify-start md:justify-end gap-2">
              <IconCoin size={28} className="text-amber-600" />
              {balance}
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
                {/* <div className="flex gap-4">
                  <div className="p-3 bg-violet-100 dark:bg-violet-900/50 rounded-xl">
                    <IconLink size={24} className="text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800 dark:text-white">Master-Slave Copying</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Seamless trade replication</div>
                  </div>
                </div> */}
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

        {/* Accounts Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <SkeletonLoader />
          ) : accounts.length === 0 ? (
            <div className="text-center py-10 text-gray-500 dark:text-gray-400">
              No accounts found. Add accounts in the Accounts section.
            </div>
          ) : (
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
                  const role = account?.isActive?account.masterAccountID ? "Slave" : "Master":"—";
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
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">{formatCurrency(account.balance)} {account.depositCurrency}</td>
                      <td className="px-4 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(account.isActive)}`}>
                          {account.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">{account?.creditExpiryTime ? formatDate(account.creditExpiryTime) : "—"}</td>
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">{role}</td>
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">{account.masterAccountID || "—"}</td>
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {account.isActive ? (
                          <Switch label=""
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
          )}
        </div>
      </div>

      {/* Action Modal */}
      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-md m-4 z-50">
        <div className="p-6 bg-white dark:bg-gray-900 rounded-3xl">
          <h4 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white/90 flex items-center">
            {actionType === "activate" ? "Activate Account" : actionType === "addCredits" ? "Add Credits" : "Replace Account"}
          </h4>
          {selectedAccount && (
            <form onSubmit={handleSubmit}>
              <p className="mb-4 flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <span>Account:</span>
                <strong>{selectedAccount.accountNumber}</strong>
                <Image
                  src={
                    selectedAccount.platform === "MT5" ? mt5 : cTraderIcon
                  }
                  alt="Logo"
                  width={25}
                  height={25}
                />
              </p>

              {actionType === "replace" && (
                <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
                  The active status, credit expiry time, auto renew setting, and role will be transferred to the new account. Master account ID will be transferred if applicable.
                </p>
              )}
              {actionType === "replace" && (
                <div className="mb-4">
                  <Label>New Account</Label>
                  <Select
                    defaultValue={formData.newAccountNumber}
                    onChange={(value) => handleSelectChange("newAccountNumber", value)}
                    options={getInactiveAccounts().map((acc) => ({ value: acc.accountNumber, label: acc.accountNumber }))}
                    className={errors.newAccountNumber ? "border-red-500" : ""}
                  />
                  {errors.newAccountNumber && <p className="mt-1 text-sm text-red-500">{errors.newAccountNumber}</p>}
                </div>
              )}
              {(actionType === "activate" || actionType === "addCredits") && (
                <div className="mb-4">
                  <Label>Credits (1 credit = 30 days)</Label>
                  <Input
                    type="number"
                    name="credits"
                    value={formData.credits}
                    onChange={handleInputChange}
                    min={1}
                    max={12}
                    placeholder="Enter credits"
                    className={errors.credits ? "border-red-500" : ""}
                  />
                  {errors.credits && <p className="mt-1 text-sm text-red-500">{errors.credits}</p>}
                </div>
              )}
              <div className="flex justify-end gap-3">
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
      </Modal>
    </div>
  );
}