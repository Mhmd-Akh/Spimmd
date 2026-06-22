import React, { useEffect, useState, useRef } from "react";
import { IoClose, IoChevronDown, IoChevronUp, IoNotifications } from "react-icons/io5";
import { useTranslation } from "react-i18next";

export default function UpdateNotification() {
  const { t } = useTranslation();
  const [updateData, setUpdateData] = useState(null);
  const [showPanel, setShowPanel] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [percent, setPercent] = useState(0);
  const [ready, setReady] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState({});
  const listenersSetup = useRef(false);

  useEffect(() => {
    if (!window.electronAPI || listenersSetup.current) return;
    listenersSetup.current = true;

    window.electronAPI.onUpdateAvailable((info) => {
      setUpdateData({
        versions: [info],
        required: info.required || false,
      });
      setShowPanel(true);
    });

    window.electronAPI.onDownloadProgress((pct) => setPercent(Math.floor(pct)));

    window.electronAPI.onUpdateDownloaded(() => {
      setDownloading(false);
      setReady(true);
    });
  }, []);

  const handleDownload = async () => {
    if (!window.electronAPI) return;
    setDownloading(true);
    await window.electronAPI.downloadUpdate();
  };

  const handleInstall = () => {
    if (window.electronAPI) window.electronAPI.installUpdate();
  };

  const handleDismiss = () => {
    if (updateData?.required) return;
    setDismissed(true);
    setShowPanel(false);
  };

  const toggleNotes = (version) => {
    setExpandedNotes((prev) => ({ ...prev, [version]: !prev[version] }));
  };

  // 🔥 آیکون تو TopBar رو اینجا مدیریت کن
  const hasUpdate = !dismissed && updateData !== null;

  if (!hasUpdate && !showPanel) return null;

  const isRequired = updateData?.required;

  return (
    <>
      {/* 🔥 دکمه شناور پایین صفحه */}
      {hasUpdate && !showPanel && (
        <button
          className="update-floating-btn"
          onClick={() => setShowPanel(true)}
          title={t('update.newUpdate')}
        >
          <IoNotifications />
          <span className="update-floating-badge" />
        </button>
      )}

      {/* 🔥 پنل کشویی پایین صفحه */}
      {showPanel && updateData && (
        <div className={`update-slide-panel ${isRequired ? "required" : ""}`}>
          <div className="update-slide-header">
            <h3>🆕 {t('update.available')}</h3>
            {!isRequired && (
              <button className="update-slide-close" onClick={handleDismiss}>
                <IoClose />
              </button>
            )}
          </div>

          <div className="update-slide-content">
            {!downloading && !ready && updateData.versions && (
              <div className="update-notification-versions">
                {updateData.versions.map((v, i) => (
                  <div key={v.version} className={`update-version-item ${i === updateData.versions.length - 1 ? "latest" : ""}`}>
                    <button className="update-version-header" onClick={() => toggleNotes(v.version)}>
                      <span className="update-version-badge">
                        {v.required ? "🔴" : "🟢"} v{v.version}
                        {i === updateData.versions.length - 1 ? ` (${t('update.latest')})` : ""}
                      </span>
                      <span className="update-version-title">{v.title || ""}</span>
                      <span className="update-version-icon">
                        {expandedNotes[v.version] ? <IoChevronUp /> : <IoChevronDown />}
                      </span>
                    </button>
                    {expandedNotes[v.version] && v.notes && (
                      <div className="update-version-notes">
                        {v.releaseDate && <p className="update-version-date">📅 {v.releaseDate}</p>}
                        {v.notes.map((note, j) => <p key={j} className="update-version-note">{note}</p>)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {downloading && (
              <div className="update-notification-progress">
                <div className="update-notification-progress-bar">
                  <div className="update-notification-progress-fill" style={{ width: `${percent}%` }} />
                </div>
                <span className="update-notification-percent">{percent}%</span>
              </div>
            )}

            {isRequired && (
              <p className="update-notification-required">{t('update.required')}</p>
            )}

            <div className="update-notification-actions">
              {!downloading && !ready && (
                <button className="btn-primary btn-sm" onClick={handleDownload}>
                  📥 {t('update.download')}
                </button>
              )}
              {ready && (
                <button className="btn-primary btn-sm" onClick={handleInstall}>
                  🔄 {t('update.install')}
                </button>
              )}
              {!isRequired && !downloading && !ready && (
                <button className="btn-secondary btn-sm" onClick={handleDismiss}>
                  {t('update.later')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}