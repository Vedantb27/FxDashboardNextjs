"use client";
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { ClipLoader } from "react-spinners";
import { useModal } from "../../../../hooks/useModal";
import Request from "../../../../utils/request";
import PageBreadcrumb from "../../../../components/common/PageBreadCrumb";
import Button from "../../../../components/ui/button/Button";
import { Modal } from "../../../../components/ui/modal";

// Tabler Icons
import {
  IconCoin,
  IconSettings,
  IconUsers,
  IconTrendingUp,
} from "@tabler/icons-react";

interface Plan {
  id: number;
  credits: number;
  price: number;
}

interface Payment {
  id: number;
  credits: number;
  amount: number;
  status: "pending" | "success" | "failed";
  transactionId?: string;
  createdAt: string;
}

export default function ManageCreditsPage() {
  const { isOpen, openModal, closeModal } = useModal();
  const [activeTab, setActiveTab] = useState<"Buy Credits" | "Payment History">("Buy Credits");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [purchaseLoading, setPurchaseLoading] = useState<number | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const plansRes = await Request({
        method: "GET",
        url: "manage-credit/plans",
      });
      if (plansRes?.plans) {
        setPlans(plansRes.plans);
      }

      const historyRes = await Request({
        method: "GET",
        url: "manage-credit/payment-history",
      });
      if (historyRes?.history) {
        setPayments(historyRes.history);
      }

      const balanceRes = await Request({
        method: "GET",
        url: "manage-credit/balance",
      });
      if (balanceRes?.balance !== undefined) {
        setBalance(balanceRes.balance);
      }
    } catch (error) {
      console.error("Error fetching credits data:", error);
      toast.error("Failed to load credits information.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (sessionId) {
      toast.success("Payment processed! Credits will be added shortly.");
      fetchData();
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handlePurchase = async (plan: Plan) => {
    setPurchaseLoading(plan.id);
    try {
      const response = await Request({
        method: "POST",
        url: "manage-credit/purchase",
        data: { planId: plan.id },
      });
      if (response?.url) {
        window.location.href = response.url;
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
      toast.error("Failed to start payment process. Please try again.");
    } finally {
      setPurchaseLoading(null);
    }
  };

  const openPurchaseModal = (plan: Plan) => {
    setSelectedPlan(plan);
    openModal();
  };

  const confirmPurchase = () => {
    if (selectedPlan) {
      handlePurchase(selectedPlan);
      closeModal();
    }
  };

  const formatCurrency = (amount: number | string) =>
    `$${Number(amount).toFixed(2)}`;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400";
      case "failed":
        return "text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400";
      case "pending":
        return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400";
      default:
        return "text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  const SkeletonLoader = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow animate-pulse">
          <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      ))}
    </div>
  );

  const HistorySkeleton = () => (
    <div className="overflow-x-auto">
      <table className="w-full table-auto">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-800">
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">Credits</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">Amount</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">Status</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">Date</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">Transaction ID</th>
          </tr>
        </thead>
        <tbody>
          {[...Array(5)].map((_, i) => (
            <tr key={i} className="border-b border-gray-200 dark:border-gray-800">
              <td className="px-4 py-3"><div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div></td>
              <td className="px-4 py-3"><div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div></td>
              <td className="px-4 py-3"><div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div></td>
              <td className="px-4 py-3"><div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded"></div></td>
              <td className="px-4 py-3"><div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded"></div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="relative">
      <PageBreadcrumb pageTitle="Credit Management" />
      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
        {/* Header - Responsive stacking on mobile */}
        <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 whitespace-nowrap">
              {activeTab}
            </h3>
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-full p-1 w-full md:w-auto">
              <button
                className={`flex-1 px-4 py-2 rounded-full text-sm font-medium transition-all ${activeTab === "Buy Credits"
                  ? "bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-300"
                  }`}
                onClick={() => setActiveTab("Buy Credits")}
              >
                Buy Credits
              </button>
              <button
                className={`flex-1 px-4 py-2 rounded-full text-sm font-medium transition-all
    whitespace-normal md:whitespace-nowrap ${activeTab === "Payment History"
                    ? "bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm"
                    : "text-gray-600 dark:text-gray-300"
                  }`}
                onClick={() => setActiveTab("Payment History")}
              >
                Payment History
              </button>

            </div>
          </div>

          <div className="text-left md:text-right w-full md:w-auto">
            <p className="text-sm text-gray-600 dark:text-gray-400">Available Credits</p>
            <p className="text-3xl font-bold text-gray-800 dark:text-white/90 flex items-center justify-start md:justify-end gap-2">
              <IconCoin size={28} className="text-amber-600" />
              {balance} Credits
            </p>
          </div>
        </div>

        {activeTab === "Buy Credits" ? (
          <>
            {/* Professional Credit Explanation Section - Stacked on mobile */}
            <div className="mb-10 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-100 dark:border-blue-800/60 rounded-3xl p-8">
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="shrink-0 p-4 bg-white dark:bg-gray-900 rounded-2xl shadow-sm mx-auto md:mx-0">
                  <IconCoin size={48} className="text-blue-600 dark:text-blue-500" />
                </div>
                <div className="space-y-4 w-full">
                  <div>
                    <h4 className="text-2xl font-semibold text-gray-900 dark:text-white text-center md:text-left">
                      How Credits Work
                    </h4>
                    <p className="mt-2 text-gray-600 dark:text-gray-400 leading-relaxed max-w-2xl text-center md:text-left">
                      One credit grants <span className="font-semibold text-gray-800 dark:text-white">30 days of full access</span>{" "}
                      to a single trading account. Each credit unlocks our complete premium suite — giving you powerful tools to trade smarter.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                    <div className="flex gap-4">
                      <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl">
                        <IconSettings size={24} className="text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800 dark:text-white">Trade Manager</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Advanced order management & automation</div>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="p-3 bg-violet-100 dark:bg-violet-900/50 rounded-xl">
                        <IconUsers size={24} className="text-violet-600 dark:text-violet-400" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800 dark:text-white">Copy Trading</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Automatically mirror trades</div>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl">
                        <IconTrendingUp size={24} className="text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800 dark:text-white">Real-Time Trade Analysis</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Live insights & performance metrics</div>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400 pt-3 text-center md:text-left">
                    ✨ One credit = 3 premium services for one account for 30 days
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <h4 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white/90">Available Credit Packs</h4>
              {loading ? (
                <SkeletonLoader />
              ) : plans.length === 0 ? (
                <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                  No credit plans available at the moment.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {plans.map((plan) => (
                    <div
                      key={plan.id}
                      className="group bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-md transition-all duration-200 overflow-hidden"
                    >
                      <div className="p-8">
                        <div className="flex justify-center mb-1">
                          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 dark:bg-blue-950 rounded-2xl">
                            <IconCoin size={36} className="text-blue-600 dark:text-blue-400" />
                          </div>
                        </div>
                        <h5 className="text-center text-[28px] font-semibold tracking-tight text-gray-900 dark:text-white mt-4">
                          {plan.credits} Credits
                        </h5>
                        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-1">30-day access • Per credit</p>
                        <p className="text-center text-4xl font-bold text-blue-600 dark:text-blue-400 mt-3">
                          {formatCurrency(plan.price)}
                        </p>
                      </div>

                      <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/70 px-8 py-5">
                        <Button
                          className="w-full h-12 text-base font-semibold"
                          onClick={() => openPurchaseModal(plan)}
                          disabled={purchaseLoading === plan.id}
                        >
                          {purchaseLoading === plan.id ? (
                            <ClipLoader color="#ffffff" size={20} />
                          ) : (
                            "Purchase Now"
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          // Payment History - Horizontal scroll preserved for mobile
          <div className="overflow-x-auto">
            {loading ? (
              <HistorySkeleton />
            ) : payments.length === 0 ? (
              <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                No payment history found.
              </div>
            ) : (
              <table className="w-full table-auto min-w-[600px]">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">Credits</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">Amount</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">Transaction ID</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="px-4 py-4 text-sm font-medium text-gray-800 dark:text-white">{payment.credits}</td>
                      <td className="px-4 py-4 text-sm font-medium">{formatCurrency(payment.amount)}</td>
                      <td className="px-4 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                          {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {new Date(payment.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                      </td>
                      <td className="px-4 py-4 text-sm font-mono text-gray-500 dark:text-gray-400">
                        {payment.transactionId || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal - Already mobile-friendly */}
      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-md m-4">
        <div className="p-6 bg-white dark:bg-gray-900 rounded-3xl">
          <h4 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white/90">
            Confirm Purchase
          </h4>
          {selectedPlan && (
            <>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                You are about to purchase <strong>{selectedPlan.credits} Credits</strong> for{" "}
                <strong>{formatCurrency(selectedPlan.price)}</strong>.
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
                This provides 30 days of access to Trade Manager, Copy Trading, and Real-Time Trade Analysis for one trading account per credit.
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="outline" size="sm" onClick={closeModal}>
                  Cancel
                </Button>
                <Button size="sm" onClick={confirmPurchase} disabled={purchaseLoading !== null}>
                  {purchaseLoading !== null ? <ClipLoader color="#ffffff" size={20} /> : "Confirm & Pay"}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}