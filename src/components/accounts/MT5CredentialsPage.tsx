"use client";
import React, { useState, useEffect } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { toast } from "react-toastify";
import { ClipLoader } from "react-spinners";
import Request from "../../utils/request";
import Button from "../../components/ui/button/Button";
import { Modal } from "../../components/ui/modal";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import { useModal } from "../../hooks/useModal";
import mt5 from '../../icons/mt5.png';
import cTraderIcon from '../../icons/ctrader.png'; 
import Image from "next/image";

interface Account {
  id: string;
  accountNumber: string;
  password?: string; 
  server?: string; 
  platform: string;
  createdAt: string;
  oauthToken?: string; 
}

interface FormErrors {
  accountNumber?: string;
  password?: string;
  server?: string;
}

export default function TradingAccountsPage() {
  const { isOpen, openModal, closeModal } = useModal();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false); // New state for cTrader auth loader
  const [activeTab, setActiveTab] = useState<"MT5" | "cTrader">("MT5");
  const [formData, setFormData] = useState({
    accountNumber: "",
    password: "",
    server: "",
    platform: "MT5",
    oauthToken: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const clientId = process.env.NEXT_PUBLIC_CLIENT_ID;
  const redirectUri = typeof window !== "undefined" ? `${window.location.origin}/accounts` : "http://localhost:3000/accounts";
  const scope = 'trading'

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const response = await Request({
        method: "GET",
        url: "trading-accounts",
      });
      if (Array.isArray(response) && response.length > 0) {
        setAccounts(response);
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) {
      handleCTraderAuth(code);
    }
  }, [activeTab]);

  const handleCTraderAuth = async (code: string) => {
    setAuthLoading(true); // Show full-screen loader
    try {
      const response = await Request({
        method: "POST",
        url: "trading-accounts",
        data: {
          accountNumber: `cTrader-${code.slice(0, 8)}`,
          platform: "cTrader",
          code 
        },
      });
      if (response?.status === 201) {
        toast.success("cTrader account added successfully");
        fetchAccounts();
        setActiveTab('cTrader')
      }
    } catch (error) {
      console.error("Error adding cTrader account:", error);
      toast.error("Failed to add cTrader account. Please try again.");
    } finally {
      window.history.replaceState({}, document.title, window.location.pathname);
      setAuthLoading(false); 
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validateForm = (): boolean => {
    if (activeTab === "cTrader") return true;
    const newErrors: FormErrors = {};
    
    if (!formData.accountNumber.trim()) {
      newErrors.accountNumber = "Account number is required";
    }
    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
    }
    if (!formData.server.trim()) {
      newErrors.server = "Server is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (activeTab === "MT5" && !validateForm()) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (activeTab === "cTrader") {
      const url = `https://id.ctrader.com/my/settings/openapi/grantingaccess/?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&product=web`
      window.location.href = url;
      return;
    }

    setFormLoading(true);
    try {
      const response = await Request({
        method: "POST",
        url: "trading-accounts",
        data: { ...formData, platform: "MT5" },
      });
      if (response?.status === 201) {
        setFormData({
          accountNumber: "",
          password: "",
          server: "",
          platform: "MT5",
          oauthToken: "",
        });
        setErrors({});
        fetchAccounts();
        closeModal();
      }
    } catch (error) {
      console.error("Error adding account:", error);
      toast.error("Failed to add account. Please try again.");
    } finally {
      setFormLoading(false);
    }
  };

  const SkeletonLoader = () => (
    <div className="overflow-x-auto">
      <table className="w-full table-auto">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-800">
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">
              Account Number
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">
              Server
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">
              Platform
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">
              Added on
            </th>
          </tr>
        </thead>
        <tbody>
          {[...Array(5)]?.map((_, index) => (
            <tr
              key={index}
              className="border-b border-gray-200 dark:border-gray-800"
            >
              <td className="px-4 py-3">
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </td>
              <td className="px-4 py-3">
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </td>
              <td className="px-4 py-3">
                <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </td>
              <td className="px-4 py-3">
                <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="relative">
      {authLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-8 flex flex-col items-center gap-4">
            <ClipLoader color="#3b82f6" size={40} />
            <p className="text-gray-800 dark:text-white/90 font-medium">
              Authenticating with cTrader...
            </p>
          </div>
        </div>
      )}
      <PageBreadcrumb pageTitle="Account Management" />
      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="flex items-center text-lg font-semibold text-gray-800 dark:text-white/90">
              {activeTab} Accounts
              <Image
                src={activeTab === "MT5" ? mt5 : cTraderIcon}
                alt={`${activeTab} Logo`}
                width={activeTab === "MT5" ?36:46}
                height={activeTab === "MT5" ?36:46}
                className="object-contain ml-2"
              />
            </h3>
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-full p-1">
              <button
                className={`px-4 py-2 rounded-full text-sm font-medium ${activeTab === "MT5" ? "bg-white dark:bg-gray-700 text-gray-800 dark:text-white" : "text-gray-600 dark:text-gray-300"}`}
                onClick={() => setActiveTab("MT5")}
                disabled={authLoading}
              >
                MT5
              </button>
              <button
                className={`px-4 py-2 rounded-full text-sm font-medium ${activeTab === "cTrader" ? "bg-white dark:bg-gray-700 text-gray-800 dark:text-white" : "text-gray-600 dark:text-gray-300"}`}
                onClick={() => setActiveTab("cTrader")}
                disabled={authLoading}
              >
                cTrader
              </button>
            </div>
          </div>
          <Button
            onClick={openModal}
            size="sm"
            className="flex items-center gap-2"
            disabled={authLoading}
          >
            <svg
              className="fill-current"
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M9 3V15M3 9H15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Add New Account
          </Button>
        </div>

        {loading ? (
          <SkeletonLoader />
        ) : accounts.filter((account) => account.platform === activeTab).length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-500 dark:text-gray-400">
              No {activeTab} accounts found. Add a new account to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">
                    Account Number
                  </th>
                { activeTab=="MT5" && <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">
                    Server
                  </th>}
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">
                    Platform
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">
                    Added on
                  </th>
                </tr>
              </thead>
              <tbody>
                {accounts
                  .filter((account) => account.platform === activeTab)
                  .map((account, index) => (
                    <tr
                      key={index}
                      className="border-b border-gray-200 dark:border-gray-800"
                    >
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                        {account.accountNumber}
                      </td>
                      { activeTab=="MT5" && <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                        {account.server || "N/A"}
                      </td>}
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                        {account.platform}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                        {new Date(account.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
        <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90 flex items-center">
              Add {activeTab} Account Credentials
              <Image
                src={activeTab === "MT5" ? mt5 : cTraderIcon}
                alt={`${activeTab} Logo`}
                width={activeTab === "MT5" ?36:46}
                height={activeTab === "MT5" ?36:46}
                className="object-contain ml-2"
              />
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              {activeTab === "MT5"
                ? "Enter your MT5 account details to add a new trading account."
                : "Authenticate with cTrader to add a new trading account."}
            </p>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col">
            <div className="custom-scrollbar min-h-[100px] overflow-y-auto px-2 pb-3">
              {activeTab === "MT5" ? (
                <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                  <div className="col-span-2 lg:col-span-1">
                    <Label>Account Number</Label>
                    <Input
                      type="text"
                      name="accountNumber"
                      value={formData.accountNumber}
                      onChange={handleInputChange}
                      placeholder="Enter account number"
                      className={errors.accountNumber ? "border-red-500" : ""}
                      disabled={authLoading}
                    />
                    {errors.accountNumber && (
                      <p className="mt-1 text-sm text-red-500">{errors.accountNumber}</p>
                    )}
                  </div>
                  <div className="col-span-2 lg:col-span-1">
                    <Label>Password</Label>
                    <Input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Enter password"
                      className={errors.password ? "border-red-500" : ""}
                      disabled={authLoading}
                    />
                    {errors.password && (
                      <p className="mt-1 text-sm text-red-500">{errors.password}</p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <Label>Server</Label>
                    <Input
                      type="text"
                      name="server"
                      value={formData.server}
                      onChange={handleInputChange}
                      placeholder="Enter server address"
                      className={errors.server ? "border-red-500" : ""}
                      disabled={authLoading}
                    />
                    {errors.server && (
                      <p className="mt-1 text-sm text-red-500">{errors.server}</p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <Label>Platform</Label>
                    <Input
                      type="text"
                      name="platform"
                      value={formData.platform}
                      onChange={handleInputChange}
                      disabled
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-gray-500 dark:text-gray-400">
                    Click below to authenticate with cTrader via OAuth.
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={closeModal}
                disabled={formLoading || authLoading}
              >
                Cancel
              </Button>
              <Button 
                size="sm" 
                type="submit" 
                disabled={formLoading || authLoading}
              >
                {formLoading ? (
                  <ClipLoader color="#ffffff" size={20} />
                ) : activeTab === "MT5" ? (
                  "Add Account"
                ) : (
                  "Authenticate with cTrader"
                )}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}