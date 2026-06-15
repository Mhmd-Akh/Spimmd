import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IoSearch } from 'react-icons/io5';
import musicStore from '../store/musicStore';

export default function SearchBar() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { search } = musicStore();

  const handleSearch = (e) => {
    const value = e.target.value;
    setQuery(value);
    if (value.length >= 2) search(value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim().length >= 2) navigate('/search');
  };

  return (
    <form className="search-bar" onSubmit={handleSubmit}>
      <IoSearch className="search-icon" />
      <input
        type="text"
        placeholder={t('common.search')}
        value={query}
        onChange={handleSearch}
        className="search-input"
      />
    </form>
  );
}