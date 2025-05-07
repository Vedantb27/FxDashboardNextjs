"use client";

import { useSidebar } from "../../context/SidebarContext";
import AppHeader from "../../layout/AppHeader";
import AppSidebar from "../../layout/AppSidebar";
import Backdrop from "../../layout/Backdrop";
import { AUTH_STORAGE_KEY } from "../../utils/envConfig";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const [authData, setAuthData]:any = useState(null);
  const router = useRouter();

  // Dynamic class for main content margin based on sidebar state
  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
    ? "lg:ml-[290px]"
    : "lg:ml-[90px]";

  useEffect(()=>{
    const data:any =sessionStorage.getItem(AUTH_STORAGE_KEY)
     if(!JSON.parse(data )?.token){
      router.push("/signin");
     }
  },[])

  return (
    <div className="min-h-screen xl:flex">
      <ToastContainer
  position="top-right"
  autoClose={3000}
  hideProgressBar={false}
  closeOnClick
  pauseOnHover
  draggable
  theme="light"
  style={{ zIndex: 999999 }} // <-- This is the key fix
/>

      {/* Sidebar and Backdrop */}
      <AppSidebar />
      <Backdrop />
      {/* Main Content Area */}
      <div
        className={`flex-1 transition-all  duration-300 ease-in-out ${mainContentMargin}`}
      >
        {/* Header */}
        <AppHeader />
        {/* Page Content */}
        <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6">{children}</div>
      </div>
      
    </div>
  );
}
