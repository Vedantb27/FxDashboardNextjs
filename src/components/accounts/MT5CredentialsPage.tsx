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
import Image from "next/image";

interface MT5Account {
  id: string;
  accountNumber: string;
  password: string;
  server: string;
  platform: string;
  createdAt: string;
}

interface FormErrors {
  accountNumber?: string;
  password?: string;
  server?: string;
}

export default function MT5CredentialsPage() {
  const { isOpen, openModal, closeModal } = useModal();
  const [accounts, setAccounts] = useState<MT5Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    accountNumber: "",
    password: "",
    server: "",
    platform: "MT5",
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const response = await Request({
        method: "GET",
        url: "mt5-accounts",
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
  }, []);
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validateForm = (): boolean => {
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
    
    if (!validateForm()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setFormLoading(true);
    try {
      const response = await Request({
        method: "POST",
        url: "mt5-accounts",
        data: formData,
      });
      if (response?.status === 201) {
        setFormData({
          accountNumber: "",
          password: "",
          server: "",
          platform: "MT5",
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
    <div>
      <PageBreadcrumb pageTitle="MT5 Account Management" />
      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
        <div className="mb-6 flex items-center justify-between">
        <h3 className="flex items-center text-lg font-semibold text-gray-800 dark:text-white/90">
  MT5 Accounts
  <Image
    src={mt5}
    alt="MetaTrader 5 Logo"
    width={26}
    height={26}
    className="object-contain ml-2" 
  />
</h3>

          <Button
            onClick={openModal}
            size="sm"
            className="flex items-center gap-2"
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
        ) : accounts.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-500 dark:text-gray-400">
              No MT5 accounts found. Add a new account to get started.
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
                {accounts?.map((account,index) => (
                  <tr
                    key={index}
                    className="border-b border-gray-200 dark:border-gray-800"
                  >
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                      {account.accountNumber}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                      {account.server}
                    </td>
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
              Add MT5 Account Credentials <Image
                    src={mt5}
                    alt="MetaTrader 5 Logo"
                    width={36} // Matches Tailwind's w-24 (24 * 4px)
                    height={36} // Matches Tailwind's h-24
                    className="object-contain ml-2"
                  />
            </h4>

    

            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Enter your MT5 account details to add a new trading account.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col">
            <div className="custom-scrollbar h-[350px] overflow-y-auto px-2 pb-3">
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
            </div>
            <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={closeModal}
                disabled={formLoading}
              >
                Cancel
              </Button>
              <Button size="sm" type="submit" disabled={formLoading}>
                {formLoading ? (
                  <ClipLoader color="#ffffff" size={20} />
                ) : (
                  "Add Account"
                )}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}