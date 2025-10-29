import React, { useState, useEffect, useCallback } from 'react';
import { searchCases, fetchCaseComments } from '../services/rssService';
import { API_BASE_URL } from '../services/apiClient';
import { summarizeCaseDetails, searchAlthingi, analyzeAlthingiReviews } from '../services/geminiService';
import type { CaseDetails, AlthingiStatus, ApiCase, AlthingiReviewAnalysis, AlthingiReview } from '../types';
import { SearchIcon, CopyIcon, CheckIcon, ExternalLinkIcon, DocumentIcon, UsersIcon } from './Icons';
import LoadingSpinner from './LoadingSpinner';

// Helper components for structured layout
const Card: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, children, defaultOpen }) => (
  <details className="bg-gray-800/50 rounded-lg" open={defaultOpen}>
    <summary className="font-bold text-lg text-white p-4 cursor-pointer list-none flex justify-between items-center">
      {title}
      <span className="text-gray-400 text-sm transition-transform duration-300 transform open:rotate-90">{'>'}</span>
    </summary>
    <div className="p-4 pt-0 text-base leading-relaxed">
      {children}
    </div>
  </details>
);

const MetaDataItem: React.FC<{label: string, value: string | undefined}> = ({label, value}) => (
    <div>
        <span className="font-semibold text-gray-400">{label}: </span>
        <span className="text-white">{value || 'N/A'}</span>
    </div>
);


const List: React.FC<{ items: string[] | undefined }> = ({ items }) => {
    if (!items || items.length === 0) {
        return <p className="text-gray-400 italic">Engin gögn fundust.</p>;
    }
    return (
        <ul className="list-disc list-inside space-y-2">
        {items.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
    );
}

const StanceBadge: React.FC<{ stance: AlthingiReview['stance'] }> = ({ stance }) => {
  const baseClasses = "px-2 py-0.5 text-xs font-semibold rounded-full";
  let colorClasses = "bg-gray-600 text-gray-100";
  if (stance === 'Jákvæð') {
    colorClasses = "bg-green-600 text-green-100";
  } else if (stance === 'Neikvæð') {
    colorClasses = "bg-red-600 text-red-100";
  }
  return <span className={`${baseClasses} ${colorClasses}`}>{stance}</span>;
};


const CaseLookup: React.FC = () => {
  const [allCases, setAllCases] = useState<ApiCase[]>([]);
  const [displayedCases, setDisplayedCases] = useState<ApiCase[]>([]);
  const [selectedApiCase, setSelectedApiCase] = useState<ApiCase | null>(null);
  const [caseDetails, setCaseDetails] = useState<CaseDetails | null>(null);
  const [althingiStatus, setAlthingiStatus] = useState<AlthingiStatus | null>(null);
  const [althingiReviewAnalysis, setAlthingiReviewAnalysis] = useState<AlthingiReviewAnalysis | null>(null);
  const [isLoadingCases, setIsLoadingCases] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isLoadingAlthingi, setIsLoadingAlthingi] = useState(false);
  const [isLoadingAlthingiReviews, setIsLoadingAlthingiReviews] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  
  // Effect 1: Fetch all cases once on component mount.
  useEffect(() => {
    const loadAllCases = async () => {
      try {
        setError(null);
        setIsLoadingCases(true);
        const fetchedCases = await searchCases();
        setAllCases(fetchedCases);
      } catch (err) {
        setError((err as Error).message);
        setAllCases([]);
      } finally {
        setIsLoadingCases(false);
      }
    };
    loadAllCases();
  }, []);

  // Effect 2: Perform client-side filtering and sorting whenever dependencies change.
  useEffect(() => {
    let casesToDisplay = [...allCases];

    // 1. Filter by search term
    if (searchTerm.trim()) {
      casesToDisplay = casesToDisplay.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 2. Sort the results (Default: Newest first)
    casesToDisplay.sort((a, b) => {
      const dateA = new Date(a.created).getTime();
      const dateB = new Date(b.created).getTime();

      // Handle invalid dates by pushing them to the end
      if (isNaN(dateA)) return 1;
      if (isNaN(dateB)) return -1;
      
      return dateB - dateA; // Newest first
    });

    setDisplayedCases(casesToDisplay);

  }, [allCases, searchTerm]);


  const handleSelectCase = useCallback((caseItem: ApiCase) => {
    // Set the selected case from the list that's already loaded.
    setSelectedApiCase(caseItem);
    
    // Reset all details when a new case is selected
    setCaseDetails(null);
    setAlthingiStatus(null);
    setAlthingiReviewAnalysis(null);
    setError(null);
  }, []);

  const handleStartAnalysis = useCallback(async () => {
    if (!selectedApiCase) return;

    setError(null);
    setIsLoadingDetails(true);
    setIsLoadingAlthingi(true);
    setCaseDetails(null);
    setAlthingiStatus(null);
    setAlthingiReviewAnalysis(null);

    try {
        // Fetch the actual comments for the case first. This is crucial for accurate analysis.
        const comments = await fetchCaseComments(selectedApiCase.id.toString());

        // Run AI analysis in parallel, passing the real comments to the summary function.
        const [details, status] = await Promise.all([
            summarizeCaseDetails(selectedApiCase, comments),
            searchAlthingi(selectedApiCase.name)
        ]);

        setCaseDetails(details);
        setAlthingiStatus(status);
    } catch (err) {
        setError('Gat ekki búið til ítarlega greiningu fyrir valið mál.');
        console.error(err);
    } finally {
        setIsLoadingDetails(false);
        setIsLoadingAlthingi(false);
    }
  }, [selectedApiCase]);
  
  const handleAnalyzeAlthingiReviews = useCallback(async () => {
      if (!selectedApiCase) return;

      setIsLoadingAlthingiReviews(true);
      setAlthingiReviewAnalysis(null);
      setError(null);

      try {
          const analysis = await analyzeAlthingiReviews(selectedApiCase.name);
          setAlthingiReviewAnalysis(analysis);
      } catch (err) {
          setError('Gat ekki greint umsagnir frá Alþingi.');
          console.error(err);
      } finally {
          setIsLoadingAlthingiReviews(false);
      }
  }, [selectedApiCase]);

  const handleCopyToClipboard = () => {
    if (!selectedApiCase) return;
    
    let summaryText = `Mál: ${selectedApiCase.name}\n`;
    summaryText += `Málsnúmer: ${selectedApiCase.caseNumber}\n`;
    summaryText += `Ábyrgðaraðili: ${selectedApiCase.institution}\n`;
    summaryText += `Tengill: https://island.is/samradsgatt/mal/${selectedApiCase.id}\n\n`;
    summaryText += "========================================\n\n";
    
    if (caseDetails) {
      summaryText += `SAMANTEKT\n--------------------\n${caseDetails.summary}\n\n`;
      summaryText += `HELSTU ATRIÐI\n--------------------\n- ${caseDetails.keyPoints.join('\n- ')}\n\n`;
      
      const ca = caseDetails.consultationAnalysis;
      if (ca) {
        summaryText += `GREINING Á UMSÖGNUM\n--------------------\n${ca.summary}\n`;
        if (ca.reviewers.length > 0) {
          summaryText += `\nUmsagnaraðilar:\n- ${ca.reviewers.join('\n- ')}\n`;
        }
        if (ca.mainPoints.length > 0) {
          summaryText += `\nHelstu punktar úr umsögnum:\n- ${ca.mainPoints.join('\n- ')}\n`;
        }
        summaryText += '\n';
      }

      summaryText += `KREFJANDI SPURNINGAR TIL RÁÐHERRA\n--------------------\n- ${caseDetails.questionsForMinister.join('\n- ')}\n\n`;
      summaryText += `GREINING M.T.T. STEFNU STJÓRNVALDA\n--------------------\n${caseDetails.policyAnalysis}\n\n`;
      summaryText += `DRÖG AÐ 10 MÍNÚTNA RÆÐU\n--------------------\n${caseDetails.speechDraft}\n\n`;
    }
    
    summaryText += "========================================\n\n";

    if (althingiStatus) {
      summaryText += `STAÐA Á ALÞINGI (BEIN LEIT)\n--------------------\n${althingiStatus.description}\n`;
       if (althingiStatus.sources && althingiStatus.sources.length > 0) {
         const sourcesText = althingiStatus.sources.map(s => s.web ? `- ${s.web?.title}: ${s.web?.uri}` : null).filter(Boolean).join('\n');
         summaryText += `\nHeimildir:\n${sourcesText}\n`;
       }
    }
    
    navigator.clipboard.writeText(summaryText.trim());
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) {
      return 'Engin dagsetning';
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString; // Return original string if it's not a valid date
    }
    return date.toLocaleDateString('is-IS', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const hasContent = caseDetails || althingiStatus;
  const isLoading = isLoadingDetails || isLoadingAlthingi;
  const selectedCaseLink = `https://island.is/samradsgatt/mal/${selectedApiCase?.id}`;

  return (
    <div className="h-full flex flex-col lg:flex-row gap-6">
      <div className="lg:w-1/3 flex flex-col bg-gray-900 rounded-lg p-4 h-[60vh] lg:h-full">
        <h2 className="text-xl font-bold mb-4">Málaleit</h2>
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Leita í málum..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <SearchIcon />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto pr-2">
          {isLoadingCases ? (
            <div className="flex justify-center items-center h-full">
              <LoadingSpinner />
            </div>
          ) : displayedCases.length > 0 ? (
            displayedCases.map((c) => (
              <div
                key={c.id}
                onClick={() => handleSelectCase(c)}
                className={`p-3 rounded-md cursor-pointer mb-2 transition-colors ${
                  selectedApiCase?.id === c.id ? 'bg-indigo-600' : 'bg-gray-800 hover:bg-gray-700'
                }`}
              >
                <h3 className="font-semibold text-sm">{c.name}</h3>
                <p className="text-xs text-gray-400">{formatDate(c.created)}</p>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 pt-10">
              <p>Engin mál fundust.</p>
              <p className="text-sm">Prófaðu að breyta leitarorðinu.</p>
            </div>
          )}
          {error && !isLoadingCases && <p className="text-red-500 mt-4 text-center">{error}</p>}
        </div>
      </div>

      <div className="lg:w-2/3 flex flex-col bg-gray-900 rounded-lg p-4 lg:p-6 h-auto lg:h-full lg:overflow-y-auto">
        {!selectedApiCase ? (
           <div className="flex flex-col justify-center items-center h-full text-gray-500">
             <p>Veldu mál af listanum til að sjá ítarlega greiningu.</p>
           </div>
        ) : (
          <div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold">{selectedApiCase.name}</h2>
                <a href={selectedCaseLink} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline flex items-center gap-1 text-sm">
                  Skoða á Samráðsgátt <ExternalLinkIcon />
                </a>
              </div>
              <button onClick={handleCopyToClipboard} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md flex items-center gap-2 transition-colors disabled:opacity-50">
                {isCopied ? <CheckIcon /> : <CopyIcon />}
                {isCopied ? 'Afritað!' : 'Afrita'}
              </button>
            </div>
            
            <div className="space-y-4 text-gray-300">
              {error && !isLoading && <p className="text-red-500 mt-4 text-center">{error}</p>}
              
              <Card title="Upplýsingar um mál" defaultOpen={true}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <MetaDataItem label="Málsnúmer" value={selectedApiCase.caseNumber} />
                      <MetaDataItem label="Staða" value={selectedApiCase.statusName} />
                      <MetaDataItem label="Ábyrgðaraðili" value={selectedApiCase.institution} />
                      <MetaDataItem label="Umsagnarfrestur" value={formatDate(selectedApiCase.commentDeadline)} />
                  </div>
                  {selectedApiCase.documents && selectedApiCase.documents.length > 0 && (
                      <div className="mt-4">
                          <h4 className="font-semibold text-md mb-2 text-white">Skjöl til samráðs:</h4>
                           <ul className="space-y-2">
                              {selectedApiCase.documents.map((doc) => {
                                  // The API provides the document title in the 'name' property.
                                  let displayTitle = doc.name || 'Ónefnt skjal';
                                  // The 'name' property includes the file extension, so we remove it for a cleaner display.
                                  if (doc.name && doc.fileType && doc.name.toLowerCase().endsWith(`.${doc.fileType.toLowerCase()}`)) {
                                      displayTitle = doc.name.slice(0, -(doc.fileType.length + 1));
                                  }

                                  return (
                                      <li key={doc.id}>
                                          <a href={`${API_BASE_URL}/api/documents/${doc.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-indigo-400 hover:underline">
                                              <DocumentIcon />
                                              <span>{displayTitle}</span>
                                          </a>
                                      </li>
                                  );
                              })}
                          </ul>
                      </div>
                  )}
              </Card>

              {!caseDetails && !isLoadingDetails && !isLoadingAlthingi && (
                <div className="text-center my-6">
                  <button
                    onClick={handleStartAnalysis}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 transition-colors mx-auto disabled:opacity-50"
                    disabled={isLoadingDetails || isLoadingAlthingi}
                  >
                    <SearchIcon className="h-5 w-5 text-white" />
                    Byrja ítarlega greiningu
                  </button>
                </div>
              )}

              {isLoadingDetails ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4 text-gray-400"><LoadingSpinner/><span>Hleð inn ítarlegri greiningu...</span></div>
              ) : caseDetails ? (
                <>
                  <Card title="Samantekt" defaultOpen={true}>
                    <p>{caseDetails.summary}</p>
                  </Card>
                  <Card title="Helstu atriði" defaultOpen={true}>
                    <List items={caseDetails.keyPoints} />
                  </Card>
                   <Card title="Greining á umsögnum" defaultOpen={true}>
                    <p className="mb-4">{caseDetails.consultationAnalysis.summary}</p>
                    <h4 className="font-semibold text-md mb-2 text-white">Umsagnaraðilar:</h4>
                    <List items={caseDetails.consultationAnalysis.reviewers} />
                    <h4 className="font-semibold text-md mt-4 mb-2 text-white">Helstu punktar úr umsögnum:</h4>
                    <List items={caseDetails.consultationAnalysis.mainPoints} />
                  </Card>
                  <Card title="Krefjandi spurningar til ráðherra" defaultOpen={true}>
                    <List items={caseDetails.questionsForMinister} />
                  </Card>
                  <Card title="Greining m.t.t. stefnu stjórnvalda">
                    <p className="whitespace-pre-wrap font-sans">{caseDetails.policyAnalysis}</p>
                  </Card>
                  <Card title="Drög að 10 mínútu ræðu">
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{caseDetails.speechDraft}</pre>
                  </Card>
                </>
              ) : null}

              {isLoadingAlthingi ? (
                 <div className="flex items-center gap-2 text-gray-400 p-4"><LoadingSpinner/><span>Leita að stöðu á Alþingi...</span></div>
              ) : althingiStatus ? (
                <Card title="Staða á Alþingi (Bein leit)" defaultOpen={true}>
                  <p className="text-base p-3 rounded-md bg-blue-900/50">{althingiStatus.description}</p>
                  
                  <div className="mt-4">
                      {!althingiReviewAnalysis && !isLoadingAlthingiReviews && (
                         <button 
                            onClick={handleAnalyzeAlthingiReviews} 
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md flex items-center gap-2 transition-colors disabled:opacity-50"
                            disabled={isLoadingAlthingiReviews}
                        >
                            <UsersIcon />
                            Greina umsagnir á Alþingi
                        </button>
                      )}

                      {isLoadingAlthingiReviews && (
                          <div className="flex items-center gap-2 text-gray-400 p-4"><LoadingSpinner/><span>Greini umsagnir...</span></div>
                      )}
                      
                      {althingiReviewAnalysis && (
                          <div className="mt-4 space-y-4">
                              <h4 className="font-semibold text-lg mb-2 text-white">Greining á umsögnum</h4>
                              <p>{althingiReviewAnalysis.analysisSummary}</p>

                              {althingiReviewAnalysis.reviews.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-700">
                                        <thead className="bg-gray-800">
                                            <tr>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Umsagnaraðili</th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Afstaða</th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Helstu athugasemdir</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-gray-900 divide-y divide-gray-800">
                                        {althingiReviewAnalysis.reviews.map((review, index) => (
                                            <tr key={index}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{review.reviewer}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300"><StanceBadge stance={review.stance} /></td>
                                                <td className="px-6 py-4 whitespace-normal text-sm text-gray-300">{review.summary}</td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                              ) : (
                                <p className="italic text-gray-400">Engar umsagnir fundust til að greina.</p>
                              )}
                          </div>
                      )}
                  </div>

                  {althingiStatus.sources && althingiStatus.sources.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-semibold text-md mb-2 text-white">Heimildir (fyrir stöðu):</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {althingiStatus.sources.map((source, i) => source.web && (
                          <li key={i}>
                            <a href={source.web.uri} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
                              {source.web.title || source.web.uri}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                   {althingiReviewAnalysis?.sources && althingiReviewAnalysis.sources.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-semibold text-md mb-2 text-white">Heimildir (fyrir greiningu umsagna):</h4>
                       <ul className="list-disc list-inside space-y-1 text-sm">
                        {althingiReviewAnalysis.sources.map((source, i) => source.web && (
                          <li key={i}>
                            <a href={source.web.uri} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
                              {source.web.title || source.web.uri}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card>
              ) : null}
              
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CaseLookup;