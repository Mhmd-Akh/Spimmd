import React, { useEffect, useState } from "react";
import { IoClose, IoChevronDown, IoChevronUp } from "react-icons/io5";

export default function UpdateNotification() {
  const [updateData, setUpdateData] = useState(null);
  const [currentVersion, setCurrentVersion] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [percent, setPercent] = useState(0);
  const [ready, setReady] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState({});

  useEffect(() => {
    checkForUpdates();
  }, []);

  useEffect(() => {
    initUpdates();
  }, []);

  const initUpdates = async () => {
    if (!window.electronAPI) return;

    // 🔥 گرفتن ورژن فعلی از electron
    const currentVer = await window.electronAPI.getAppVersion();
    setCurrentVersion(currentVer);

    checkForUpdates(currentVer);
  };

  const checkForUpdates = async (currentVer) => {
    try {
      const data = await window.electronAPI.checkUpdate();
      if (!data?.versions?.length) return;

      // پیدا کردن ورژن‌های جدیدتر
      const newerVersions = data.versions.filter((v) => {
        return compareVersions(v.version, currentVer) > 0;
      });

      if (newerVersions.length > 0) {
        setUpdateData({
          versions: newerVersions,
          required: newerVersions.some((v) => v.required),
        });
      }
    } catch (e) {
      console.error("Update check error:", e);
    }
  };

  // مقایسه ورژن‌ها
  const compareVersions = (a, b) => {
    const pa = a.split(".").map(Number);
    const pb = b.split(".").map(Number);
    for (let i = 0; i < 3; i++) {
      if ((pa[i] || 0) > (pb[i] || 0)) return 1;
      if ((pa[i] || 0) < (pb[i] || 0)) return -1;
    }
    return 0;
  };

  const handleDownload = async () => {
    if (!updateData?.versions?.length) return;

    setDownloading(true);
    const latestVersion =
      updateData.versions[updateData.versions.length - 1].version;

    // پروگرس بار
    const interval = setInterval(() => {
      setPercent((p) => {
        if (p >= 90) {
          clearInterval(interval);
          return 90;
        }
        return p + Math.random() * 20;
      });
    }, 500);

    try {
      await window.electronAPI.downloadUpdate(latestVersion);
      clearInterval(interval);
      setPercent(100);
      setDownloading(false);
      setReady(true);
    } catch (e) {
      clearInterval(interval);
      setDownloading(false);
    }
  };

  const handleInstall = () => {
    if (window.electronAPI) window.electronAPI.installUpdate();
  };

  const handleDismiss = () => {
    // اگه اجباریه، اجازه بسته شدن نده
    if (updateData?.required) return;
    setDismissed(true);
  };

  const toggleNotes = (version) => {
    setExpandedNotes((prev) => ({
      ...prev,
      [version]: !prev[version],
    }));
  };

  if (!updateData || dismissed) return null;

  const isRequired = updateData.required;
  const versionGap = updateData.versions.length;

  return (
    <div
      className={`update-notification-overlay ${isRequired ? "required" : ""}`}
    >
      <div className="update-notification-popup">
        {!isRequired && !downloading && !ready && (
          <button className="update-notification-close" onClick={handleDismiss}>
            <IoClose />
          </button>
        )}

        <div className="update-notification-icon">
          {ready ? "✅" : downloading ? "📥" : "🆕"}
        </div>

        <h3 className="update-notification-title">
          {ready
            ? "آپدیت آماده نصب است"
            : downloading
              ? "در حال دانلود آپدیت..."
              : `نسخه جدید موجود است (${versionGap} ورژن)`}
        </h3>

        {isRequired && (
          <p className="update-notification-required">
            ⚠️ این آپدیت اجباری است و برای ادامه استفاده باید نصب شود.
          </p>
        )}

        {/* لیست اینفو ورژن‌ها */}
        {!downloading && !ready && (
          <div className="update-notification-versions">
            {updateData.versions.map((v, i) => (
              <div
                key={v.version}
                className={`update-version-item ${i === updateData.versions.length - 1 ? "latest" : ""}`}
              >
                <button
                  className="update-version-header"
                  onClick={() => toggleNotes(v.version)}
                >
                  <span className="update-version-badge">
                    {v.required ? "🔴" : "🟢"} v{v.version}
                    {i === updateData.versions.length - 1 && " (آخرین)"}
                  </span>
                  <span className="update-version-title">{v.title}</span>
                  <span className="update-version-icon">
                    {expandedNotes[v.version] ? (
                      <IoChevronUp />
                    ) : (
                      <IoChevronDown />
                    )}
                  </span>
                </button>

                {expandedNotes[v.version] && (
                  <div className="update-version-notes">
                    <p className="update-version-date">📅 {v.releaseDate}</p>
                    {v.notes.map((note, j) => (
                      <p key={j} className="update-version-note">
                        {note}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {downloading && (
          <div className="update-notification-progress">
            <div className="update-notification-progress-bar">
              <div
                className="update-notification-progress-fill"
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="update-notification-percent">{percent}%</span>
          </div>
        )}

        <div className="update-notification-actions">
          {!downloading && !ready && (
            <button
              className="btn-primary update-notification-btn"
              onClick={handleDownload}
            >
              📥 دانلود و نصب آخرین نسخه (v
              {updateData.versions[updateData.versions.length - 1].version})
            </button>
          )}
          {ready && (
            <button
              className="btn-primary update-notification-btn"
              onClick={handleInstall}
            >
              🔄 اکنون نصب و راه‌اندازی مجدد
            </button>
          )}
          {!isRequired && !downloading && !ready && (
            <button
              className="btn-secondary update-notification-btn"
              onClick={handleDismiss}
            >
              بعداً
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
