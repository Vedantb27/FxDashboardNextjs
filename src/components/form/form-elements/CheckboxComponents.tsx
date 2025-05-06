"use client";
import React, { useState } from "react";
import ComponentCard from "../../common/ComponentCard";
import Checkbox from "../input/Checkbox";

export default function CheckboxComponents() {
  const [isChecked, setIsChecked]:any = useState(false);
  const [isCheckedTwo, setIsCheckedTwo]:any = useState(true);
  const [isCheckedDisabled, setIsCheckedDisabled]:any = useState(false);
  return (
    <ComponentCard title="Checkbox">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <Checkbox
            checked={isChecked}
            onChange={(e) => setIsChecked(e.target.checked)}
          />
          <span className="block text-sm font-medium text-gray-700 dark:text-gray-400">
            Default
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Checkbox
            checked={isCheckedTwo}
            onChange={(e) => setIsCheckedTwo(e.target.checked)}
            label="Checked"
          />
        </div>
        <div className="flex items-center gap-3">
          <Checkbox
            checked={isCheckedDisabled}
            onChange={(e) => setIsCheckedDisabled(e.target.checked)}
            disabled
            label="Disabled"
          />
        </div>
      </div>
    </ComponentCard>
  );
}
