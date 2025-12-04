import { useState, useCallback } from 'react';
import databaseService from '../services/databaseService';

export const useFirebase = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createDocument = useCallback(async (path, data) => {
    try {
      setLoading(true);
      setError(null);
      const result = await databaseService.createDocument(path, data);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateDocument = useCallback(async (path, data) => {
    try {
      setLoading(true);
      setError(null);
      const result = await databaseService.updateDocument(path, data);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteDocument = useCallback(async (path) => {
    try {
      setLoading(true);
      setError(null);
      const result = await databaseService.deleteDocument(path);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getDocument = useCallback(async (path) => {
    try {
      setLoading(true);
      setError(null);
      const result = await databaseService.getDocument(path);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    createDocument,
    updateDocument,
    deleteDocument,
    getDocument
  };
};
