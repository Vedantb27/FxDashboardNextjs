"use client";

import PageBreadcrumb from "../../../../components/common/PageBreadCrumb";
import React, { useEffect, useState } from "react";

// Declare DukascopyApplet interface to extend the Window type
interface DukascopyApplet {
  type: string;
  params: {
    header: boolean;
    orientation: string;
    pipAmount: string;
    accountCurrency: string;
    availableInstruments: string;
    width: string;
    defaultInstrument: string;
    resultColor: string;
    height: string;
    adv: string;
    lang: string;
  };
}

declare global {
  interface Window {
    DukascopyApplet: DukascopyApplet;
  }
}

export default function PipsCalculator() {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Create container for the applet
    const container = document.getElementById("dukascopy-pip-calculator");
    if (!container) {
      setError("Container element not found.");
      return;
    }

    // Create an iframe to isolate the applet
    const iframe = document.createElement("iframe");
    iframe.id = "dukascopy-iframe";
    iframe.width = "527";
    iframe.height = "237";
    iframe.style.border = "none";
    container.appendChild(iframe);

    // Access iframe's document
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      setError("Failed to access iframe document.");
      return;
    }

    // Write script and configuration to iframe
    iframeDoc.open();
    iframeDoc.write(`
      <script type="text/javascript">
        window.DukascopyApplet = {
          type: "pip_calculator",
          params: {
            header: true,
            orientation: "landscape",
            pipAmount: "100",
            accountCurrency: "USD",
            availableInstruments: "",
            width: "527",
            defaultInstrument: "EUR/USD",
            resultColor: "#696969",
            height: "237",
            adv: "popup",
            lang: "en"
          }
        };
      </script>
      <script type="text/javascript" src="https://freeserv-static.dukascopy.com/2.0/core.js"></script>
    `);
    iframeDoc.close();

    // Monitor script loading
    const checkInterval = setInterval(() => {
      if (iframeDoc.body?.innerHTML) {
        console.log("Dukascopy applet initialized in iframe");
        setIsScriptLoaded(true);
        clearInterval(checkInterval);
      }
    }, 500);

    setTimeout(() => {
      if (!isScriptLoaded) {
        setError("Calculator failed to initialize in iframe. Please try the alternative calculator.");
        clearInterval(checkInterval);
      }
    }, 5000); // Timeout after 5 seconds

    return () => {
      container.innerHTML = "";
      clearInterval(checkInterval);
    };
  }, [isScriptLoaded]);

  return (
    <div className="container mx-auto px-4 py-8">
      <PageBreadcrumb pageTitle="Pips Calculator" />
      <div className="mt-6 flex justify-center">
        <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-lg">
          <h2 className="mb-4 text-xl font-semibold text-gray-800">
            Forex Pips Calculator
          </h2>
          <div className="flex justify-center">
            <div
              id="dukascopy-pip-calculator"
              className="w-full"
              style={{ minHeight: "237px", minWidth: "527px" }}
            >
              {error ? (
                <p className="text-red-600">{error}</p>
              ) : !isScriptLoaded ? (
                <p className="text-gray-600">Loading calculator...</p>
              ) : null}
              {/* Dukascopy applet will be injected here */}
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-600">
            Use this calculator to determine the pip value for your forex trades.
            Select your account currency and instrument to get started.
          </p>
        </div>
      </div>
    </div>
  );
}