import React from 'react';
import { useTranslation } from 'react-i18next';
import musicStore from '../store/musicStore';
import TrackList from '../components/TrackList';
import AlbumGrid from '../components/AlbumGrid';
import SearchBar from '../components/SearchBar';

export default function SearchPage() {
  const { t } = useTranslation();
  const { searchResults, isLoading } = musicStore();

  return (
    <div className="search-page">
      <SearchBar />
      {isLoading && <div className="loading">{t('common.loading')}</div>}
      {searchResults && (
        <>
          {searchResults.song?.length > 0 && (
            <>
              <h2 className="section-title">{t('library.songs')}</h2>
              <TrackList tracks={searchResults.song} />
            </>
          )}
          {searchResults.album?.length > 0 && (
            <AlbumGrid albums={searchResults.album} title={t('nav.albums')} />
          )}
          {!searchResults?.song?.length && !searchResults?.album?.length && (
            <div className="error-message">{t('common.noResults')}</div>
          )}
        </>
      )}
    </div>
  );
}