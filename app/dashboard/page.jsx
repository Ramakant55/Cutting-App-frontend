"use client"

import { useState, useMemo, useEffect, useRef } from "react"
// Using localStorage auth instead of next-auth
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { AlertCircle, Calculator, Trash2, Check, X, RefreshCw, Copy, ClipboardCheck } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "@/components/ui/use-toast"
import { ToastAction } from "@/components/ui/toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog"

export default function NumberTrackerPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)

  // Check if user is authenticated
  useEffect(() => {
    // Safely access localStorage only on client side
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token')
      const userData = localStorage.getItem('user')
      
      if (!token || !userData) {
        router.push('/login')
        return
      }

      try {
        setUser(JSON.parse(userData))
      } catch (err) {
        console.error('Error parsing user data:', err)
        router.push('/login')
      }
    }
  }, [router])
  
  // Create an array of numbers from 0 to 99 with padding
  const numbers = Array.from({ length: 100 }, (_, i) => String(i).padStart(2, "0"))

  // State for the app
  const [numberValues, setNumberValues] = useState({})
  const [globalThreshold, setGlobalThreshold] = useState(0)
  const [numbersInput, setNumbersInput] = useState("")
  const [valueInput, setValueInput] = useState("")
  const [thresholdInput, setThresholdInput] = useState("")
  const [inputError, setInputError] = useState("")
  const [selectedNumber, setSelectedNumber] = useState("00")
  const [editingNumber, setEditingNumber] = useState("")
  const [editingIndex, setEditingIndex] = useState(-1)
  const [editValueInput, setEditValueInput] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [hasCopied, setHasCopied] = useState(false)
  
  // Ref for the numbers input field
  const numbersInputRef = useRef(null)
  
  // Load data from API on initial render when authenticated
  useEffect(() => {
    async function loadData() {
      // Safely access localStorage only on client side
      if (typeof window === 'undefined') return
      
      const token = localStorage.getItem('token')
      if (token) {
        try {
          setIsLoading(true)
          const response = await fetch("https://kdm-cuttingapp.onrender.com/api/data", {
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json"
            }
          })
          
          if (response.ok) {
            const data = await response.json()
            console.log("Loaded data from API:", data)
            
            // Process data from the backend to our format
            // New format: data.numbers = { "01": 50, "02": 100, ... }
            if (data && data.numbers) {
              // Create a structure to hold all values per number
              const processedData = {}
              
              // Process the numbers object returned from backend
              Object.entries(data.numbers).forEach(([numberKey, value]) => {
                // Make sure the number is properly formatted with leading zeros
                const numStr = String(numberKey).padStart(2, '0')
                
                // Each value in our frontend needs to be an array
                // We'll fetch the history for each number if available
                if (!processedData[numStr]) {
                  processedData[numStr] = []
                }
                
                // Store the total value as individual entries (for backward compatibility)
                // This is a workaround until the backend returns full history per number
                if (typeof value === 'number') {
                  // If the backend sends a history array, use that instead
                  if (data.history && data.history[numberKey] && Array.isArray(data.history[numberKey])) {
                    processedData[numStr] = [...data.history[numberKey]]
                  } else {
                    // Fallback: Store the total as a single value in the array
                    processedData[numStr] = [value]
                  }
                }
              })
              
              console.log("Processed data:", processedData)
              setNumberValues(processedData)
              
              // For now, we don't have threshold in the new data format
              // You can add this back later if needed
              // setGlobalThreshold(someValue)
            }
          }
        } catch (error) {
          console.error("Error loading data from API:", error)
          toast({
            variant: "destructive",
            title: "Error loading data",
            description: "There was a problem loading your data.",
            action: <ToastAction altText="Try again">Try again</ToastAction>,
          })
        } finally {
          setIsLoading(false)
          setIsLoading(false)
        }
      }
    }
    
    const token = localStorage.getItem('token')
    if (token) {
      loadData()
    } else {
      setIsLoading(false)
    }
  }, [])

  // Save data to API
  const saveDataToAPI = async (newNumberValues = numberValues, isAddingNewValues = true) => {
    if (typeof window === 'undefined') return
    const token = localStorage.getItem('token')
    if (!token) {
      toast({
        variant: "destructive",
        title: "Authentication required",
        description: "You must be logged in to save data.",
      })
      return
    }
    
    try {
      // We need to handle two different cases:
      // 1. When adding new values - we want to add to existing totals
      // 2. When editing existing values - we want to set the value directly
      
      // First, clear all existing values if we're not adding new values
      if (!isAddingNewValues) {
        // Using the edit endpoint to clear values
        await fetch("https://kdm-cuttingapp.onrender.com/api/data/edit", {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            clearAll: true
          }),
        });
      }
      
      // Create a flattened array of data entries from the number values
      const entries = [];
      
      Object.keys(newNumberValues).forEach(number => {
        // If we're editing, just send the total sum for each number
        if (!isAddingNewValues) {
          const total = newNumberValues[number].reduce((sum, val) => sum + val, 0);
          entries.push({
            numberKey: number,
            value: total,
            isAddValue: false // Set the value directly, don't add to existing
          });
        } else {
          // If adding new values, send each value separately with isAddValue flag
          newNumberValues[number].forEach(value => {
            entries.push({
              numberKey: number,
              value: value,
              isAddValue: true // Add to existing value
            });
          });
        }
      });
      
      console.log('Saving data entries:', entries);
      
      // Save each entry individually
      for (const entry of entries) {
        const response = await fetch("https://kdm-cuttingapp.onrender.com/api/data", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(entry),
        });
        
        if (!response.ok) {
          console.log('Failed response:', await response.text());
          throw new Error("Failed to save data");
        }
      }
      
      toast({
        title: "Data saved",
        description: "Your number data has been saved successfully.",
      });
      
    } catch (error) {
      console.error("Error saving data to API:", error);
      toast({
        variant: "destructive",
        title: "Error saving data",
        description: "There was a problem saving your data.",
        action: <ToastAction altText="Try again">Try again</ToastAction>,
      });
    }
  }

  // Handle numbers input change with auto-formatting
  const handleNumbersInputChange = (e) => {
    const value = e.target.value
    // Only allow numbers, commas, and periods
    let filteredValue = value.replace(/[^0-9,.]/g, "")

    // Auto-format: If the last two characters are digits and there's no comma after them
    const lastTwoCharsAreDigits = /[0-9]{2}$/.test(filteredValue)
    const hasCommaOrPeriodAtEnd = /[,.]$/.test(filteredValue)

    if (lastTwoCharsAreDigits && !hasCommaOrPeriodAtEnd && filteredValue.length >= 2) {
      // Check if we just added the second digit (length increased by 1)
      if (filteredValue.length > numbersInput.length && filteredValue.length % 3 === 2) {
        filteredValue = filteredValue + ","

        // Set cursor position after the comma
        setTimeout(() => {
          if (numbersInputRef.current) {
            numbersInputRef.current.selectionStart = filteredValue.length
            numbersInputRef.current.selectionEnd = filteredValue.length
          }
        }, 0)
      }
    }

    setNumbersInput(filteredValue)
  }

  // Calculate the sum of values for a number
  const getSum = (number) => {
    if (!numberValues[number]) return 0
    return numberValues[number].reduce((sum, value) => sum + value, 0)
  }

  // Add values to numbers
  const addValues = async () => {
    // Add fetch logic to load/save data from your custom auth backend instead of next-auth API route
    if (!numbersInput || !valueInput) {
      setInputError("Please enter both numbers and a value")
      return
    }

    const value = Number.parseFloat(valueInput)
    if (isNaN(value)) {
      setInputError("Please enter a valid number for value")
      return
    }

    // Parse the numbers input - support both comma and period as separators
    const inputNumbers = numbersInput
      .replace(/[,.]/g, ",") // Replace all periods with commas
      .split(",") // Split by comma
      .map((num) => num.trim())
      .filter((num) => num.length > 0) // Remove empty entries

    const validNumbers = []
    const invalidNumbers = []

    // Validate each number
    inputNumbers.forEach((num) => {
      // Check if it's in our valid range (00-99)
      const paddedNum = num.padStart(2, "0")
      if (numbers.includes(paddedNum)) {
        validNumbers.push(paddedNum)
      } else {
        invalidNumbers.push(num)
      }
    })

    if (invalidNumbers.length > 0) {
      setInputError(`Invalid numbers: ${invalidNumbers.join(", ")}. Please use numbers between 0-99.`)
      return
    }

    if (validNumbers.length === 0) {
      setInputError("No valid numbers found")
      return
    }

    // Add the value to each valid number
    const newNumberValues = { ...numberValues }
    
    // Track each number being modified, including duplicate entries
    const entries = []
    
    // Process each valid number entry (including duplicates)
    for (const num of validNumbers) {
      // Add to local state
      if (!newNumberValues[num]) {
        newNumberValues[num] = []
      }
      newNumberValues[num].push(value)
      
      // Create a separate entry for each occurrence (even if it's the same number)
      entries.push({
        numberKey: num, 
        value: value,
        isAddValue: true // Add to existing value
      })
    }

    setNumberValues(newNumberValues)

    // Save to API - directly send individual entries including duplicates
    if (typeof window === 'undefined') return
    const token = localStorage.getItem('token')
    if (token) {
      try {
        // Send each entry separately to ensure all duplicates are processed
        for (const entry of entries) {
          const response = await fetch("https://kdm-cuttingapp.onrender.com/api/data", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(entry),
          })
          
          if (!response.ok) {
            throw new Error("Failed to save data")
          }
        }
        
        toast({
          title: "Data saved",
          description: "Your number data has been saved successfully.",
        })
      } catch (error) {
        console.error("Error saving data to API:", error)
        toast({
          variant: "destructive",
          title: "Error saving data",
          description: "There was a problem saving your data.",
          action: <ToastAction altText="Try again">Try again</ToastAction>,
        })
      }
    }

    setInputError("")
    setNumbersInput("")
    setValueInput("")

    // If only one number was entered, select it for viewing details
    if (validNumbers.length === 1) {
      setSelectedNumber(validNumbers[0])
    }
  }

  // Set global threshold
  const setThreshold = () => {
    if (!thresholdInput) return

    const value = Number.parseFloat(thresholdInput)
    if (isNaN(value)) return

    // Just set it in the UI, don't save to database
    setGlobalThreshold(value)
    setThresholdInput("")
    
    toast({
      title: "Threshold updated",
      description: "Global threshold has been updated for UI display only."
    })
  }

  // Start editing a value
  const startEditing = (number, index) => {
    // Cancel any ongoing edit first
    if (editingNumber && editingIndex !== -1) {
      cancelEditing()
    }

    setEditingNumber(number)
    setEditingIndex(index)
    setEditValueInput(numberValues[number][index].toString())
  }

  // Save edited value
  const saveEditedValue = async () => {
    const value = Number.parseFloat(editValueInput)
    if (isNaN(value)) return

    const newValues = { ...numberValues }
    newValues[editingNumber] = [...newValues[editingNumber]]
    newValues[editingNumber][editingIndex] = value

    setNumberValues(newValues)

    // Save to API with isAddingNewValues = false to indicate we're setting values, not adding
    await saveDataToAPI(newValues, false)

    cancelEditing()
  }

  // Cancel editing
  const cancelEditing = () => {
    setEditingNumber("")
    setEditingIndex(-1)
    setEditValueInput("")
  }

  // Delete value
  const deleteValue = async (number, index) => {
    const newValues = { ...numberValues }
    newValues[number] = newValues[number].filter((_, i) => i !== index)

    // If there are no more values for this number, remove the number from the object
    const isLastValue = newValues[number].length === 0
    if (isLastValue) {
      delete newValues[number]
      
      // Call the delete endpoint to remove the number completely from backend
      if (typeof window === 'undefined') return
      const token = localStorage.getItem('token')
      if (token) {
        try {
          await fetch(`https://kdm-cuttingapp.onrender.com/api/data/delete/${number}`, {
            method: "DELETE",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
            }
          });
        } catch (error) {
          console.error("Error deleting number:", error);
        }
      }
    } else {
      // If not the last value, we need to update the remaining values
      // Send only this number's new total to the API
      const singleNumberObject = {}
      singleNumberObject[number] = newValues[number]
      await saveDataToAPI(singleNumberObject, false) // false = set directly
    }

    setNumberValues(newValues)

    // If we were editing this value, cancel the edit
    if (number === editingNumber && index === editingIndex) {
      cancelEditing()
    }
  }

  // Reset all data
  const resetAllData = async () => {
    // Clear all state
    setNumberValues({})
    setGlobalThreshold(0)
    setThresholdInput("")
    setNumbersInput("")
    setValueInput("")
    setInputError("")
    setSelectedNumber("00")
    cancelEditing()

    // Clear all data in the database
    const token = localStorage.getItem('token')
    if (token) {
      try {
        // Use the edit endpoint with clearAll:true to remove all data
        await fetch("https://kdm-cuttingapp.onrender.com/api/data/edit", {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            clearAll: true
          }),
        })
      } catch (error) {
        console.error("Error clearing data:", error)
      }
    }

    // Show success message
    toast({
      title: "Data reset successfully",
      description: "All data has been cleared.",
      action: <ToastAction altText="OK">OK</ToastAction>,
    })
  }

  // Calculate kept and excess amounts
  const getKeptAmount = (number) => {
    const total = getSum(number)
    return Math.min(total, globalThreshold)
  }

  const getExcessAmount = (number) => {
    const total = getSum(number)
    return total > globalThreshold ? total - globalThreshold : 0
  }

  // Get consolidated excess string for all numbers
  const consolidatedExcess = useMemo(() => {
    const excesses = numbers
      .filter((number) => getExcessAmount(number) > 0)
      .map((number) => `${number}(${getExcessAmount(number)})`)

    return excesses.length > 0 ? excesses.join(", ") : "None"
  }, [numberValues, globalThreshold])

  // Total excess amount across all numbers
  const totalExcessAmount = useMemo(() => {
    return numbers.reduce((total, number) => total + getExcessAmount(number), 0)
  }, [numberValues, globalThreshold])

  // Total kept amount across all numbers
  const totalKeptAmount = useMemo(() => {
    return numbers.reduce((total, number) => total + getKeptAmount(number), 0)
  }, [numberValues, globalThreshold])

  // Grand total of all values across all numbers
  const grandTotal = useMemo(() => {
    return numbers.reduce((total, number) => total + getSum(number), 0)
  }, [numberValues])

  // Handle keydown events for the edit input
  const handleEditKeyDown = (e) => {
    if (e.key === "Enter") {
      saveEditedValue()
    } else if (e.key === "Escape") {
      cancelEditing()
    }
  }
  
  // Copy excess numbers to clipboard
  const copyExcessNumbers = () => {
    // Get only the numbers with excess values AND their excess amounts
    const excessNumbersWithValues = numbers
      .filter((number) => getExcessAmount(number) > 0)
      .map((number) => `${number}(${getExcessAmount(number)})`)
      .join(", ")
      
    if (excessNumbersWithValues) {
      navigator.clipboard.writeText(excessNumbersWithValues)
        .then(() => {
          setHasCopied(true)
          toast({
            title: "Copied to clipboard",
            description: "Excess numbers have been copied to clipboard.",
          })
          // Reset the copied state after 2 seconds
          setTimeout(() => setHasCopied(false), 2000)
        })
        .catch(err => {
          console.error("Failed to copy text: ", err)
          toast({
            variant: "destructive",
            title: "Copy failed",
            description: "Failed to copy to clipboard. Try again.",
          })
        })
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg">Loading...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-4 px-2 md:py-8 md:px-4">
      <header className="flex justify-between items-center mb-8 pb-4 border-b">
        <h1 className="text-xl md:text-3xl font-bold">ESI</h1>
        
        <div className="flex items-center gap-4">
          <div>
            <p className="font-medium">Welcome, {user?.name || user?.email || user?.phone}</p>
          </div>
          <Button variant="outline" onClick={() => {
            if (typeof window !== 'undefined') {
              localStorage.removeItem('token')
              localStorage.removeItem('user')
              router.push('/login')
            }
          }}>
            Logout
          </Button>
        </div>
      </header>
      
      <Card className="mb-6">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
          <CardTitle className="text-xl md:text-2xl">Number Value Tracker</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:gap-4 mb-4 md:mb-6">
            <div>
              <Label htmlFor="numbers" className="mb-2 block">
                Enter numbers (single or multiple, comma separated)
              </Label>
              <Input
                id="numbers"
                placeholder="Example: 00 or 00,04,67,89"
                value={numbersInput}
                onChange={handleNumbersInputChange}
                inputMode="numeric"
                pattern="[0-9,.]+"
                ref={numbersInputRef}
              />
              <p className="hidden md:block text-sm text-muted-foreground mt-1">
                For a single number, enter like "00". For multiple numbers, enter like "00,04,67" (commas will be added
                automatically)
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
              <div className="w-full sm:flex-1">
                <Label htmlFor="value" className="mb-1 md:mb-2 block">
                  Value to add
                </Label>
                <Input
                  id="value"
                  type="number"
                  placeholder="Enter value"
                  value={valueInput}
                  onChange={(e) => setValueInput(e.target.value)}
                />
              </div>
              <div className="flex sm:items-end mt-2 sm:mt-0">
                <Button onClick={addValues} className="w-full sm:w-auto">
                  Add Value(s)
                </Button>
              </div>
            </div>

            {inputError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{inputError}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-3 md:mt-4">
              <div className="w-full sm:w-32">
                <Label htmlFor="threshold">Global Threshold</Label>
              </div>
              <Input
                id="threshold"
                type="number"
                placeholder="Set threshold for all numbers"
                value={thresholdInput}
                onChange={(e) => setThresholdInput(e.target.value)}
                className="flex-1"
              />
              <Button onClick={setThreshold} variant="outline" className="mt-2 sm:mt-0">
                Set Threshold
              </Button>
            </div>
          </div>

          <div className="flex gap-4 mb-4">
            <div className="w-full">
              <Label htmlFor="selectedNumber" className="mb-2 block">
                Select a number to view details
              </Label>
              <select
                id="selectedNumber"
                className="w-full p-2 border rounded"
                value={selectedNumber}
                onChange={(e) => setSelectedNumber(e.target.value)}
              >
                {numbers.map((num) => (
                  <option key={num} value={num}>
                    {num} {getSum(num) > 0 ? `(Total: ${getSum(num)})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {numberValues[selectedNumber] && numberValues[selectedNumber].length > 0 && (
            <div className="mb-4">
              <h3 className="text-lg font-medium mb-2">Values for {selectedNumber}:</h3>
              <div className="flex flex-wrap gap-1 md:gap-2">
                {numberValues[selectedNumber].map((value, index) => (
                  <div
                    key={index}
                    className="bg-muted px-2 py-1 md:px-3 rounded flex items-center gap-1 md:gap-2 text-sm md:text-base"
                  >
                    {editingNumber === selectedNumber && editingIndex === index ? (
                      <>
                        <Input
                          type="number"
                          value={editValueInput}
                          onChange={(e) => setEditValueInput(e.target.value)}
                          onKeyDown={handleEditKeyDown}
                          className="w-20 h-6 px-1 py-0"
                          autoFocus
                        />
                        <div className="flex items-center gap-1">
                          <button
                            onClick={saveEditedValue}
                            className="text-green-500 hover:text-green-700 p-1"
                            aria-label="Save"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="text-red-500 hover:text-red-700 p-1"
                            aria-label="Cancel"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEditing(selectedNumber, index)} className="hover:text-blue-600">
                          {value}
                        </button>
                        {editingNumber === "" && (
                          <button
                            onClick={() => deleteValue(selectedNumber, index)}
                            className="text-red-500 hover:text-red-700 p-1"
                            aria-label={`Delete value ${value}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                ))}
                <div className="bg-primary text-primary-foreground px-3 py-1 rounded font-bold">
                  Total: {getSum(selectedNumber)}
                </div>
              </div>
            </div>
          )}

          {globalThreshold > 0 && (
            <div className="mt-4 p-4 border rounded-md bg-muted/30">
              <h3 className="text-lg font-medium mb-2">Global Threshold: {globalThreshold}</h3>

              <div className="grid grid-cols-1 gap-3 md:gap-4 mb-3 md:mb-4">
                <div className="p-4 bg-amber-100 rounded-md">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground mb-1">Excess Amounts (All Numbers)</div>
                    {numbers.some(number => getExcessAmount(number) > 0) && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 px-2 ml-2" 
                        onClick={copyExcessNumbers} 
                        title="Copy all excess numbers"
                      >
                        {hasCopied ? <ClipboardCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        <span className="ml-1 hidden md:inline">Copy Numbers</span>
                      </Button>
                    )}
                  </div>
                  <div className="text-lg font-medium break-words">{consolidatedExcess}</div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-sm text-muted-foreground">Total Excess: </span>
                      <span className="font-semibold">{totalExcessAmount}</span>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Total Kept: </span>
                      <span className="font-semibold">{totalKeptAmount}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div className="p-3 bg-green-100 rounded-md">
                  <div className="text-sm text-muted-foreground">Selected Number Kept</div>
                  <div className="text-xl font-bold">{getKeptAmount(selectedNumber)}</div>
                </div>
                <div className="p-3 bg-amber-100 rounded-md">
                  <div className="text-sm text-muted-foreground">Selected Number Excess</div>
                  <div className="text-xl font-bold">
                    {getExcessAmount(selectedNumber) > 0 ? (
                      <>
                        {selectedNumber}({getExcessAmount(selectedNumber)})
                      </>
                    ) : (
                      "0"
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Number Values Table</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Values</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Kept</TableHead>
                  <TableHead>Excess</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {numbers.map((number) => (
                  <TableRow key={number} className={selectedNumber === number ? "bg-muted/50" : ""}>
                    <TableCell className="p-1 md:p-2 font-medium">{number}</TableCell>
                    <TableCell className="p-1 md:p-2">
                      {numberValues[number] ? (
                        <div className="flex flex-wrap gap-1">
                          {numberValues[number].map((value, index) => (
                            <div key={index} className="bg-muted px-2 py-0.5 rounded text-sm flex items-center gap-1">
                              {editingNumber === number && editingIndex === index ? (
                                <>
                                  <Input
                                    type="number"
                                    value={editValueInput}
                                    onChange={(e) => setEditValueInput(e.target.value)}
                                    onKeyDown={handleEditKeyDown}
                                    className="w-16 h-5 px-1 py-0 text-xs"
                                    autoFocus
                                  />
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={saveEditedValue}
                                      className="text-green-500 hover:text-green-700 p-0.5"
                                      aria-label="Save"
                                    >
                                      <Check className="h-2.5 w-2.5" />
                                    </button>
                                    <button
                                      onClick={cancelEditing}
                                      className="text-red-500 hover:text-red-700 p-0.5"
                                      aria-label="Cancel"
                                    >
                                      <X className="h-2.5 w-2.5" />
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => startEditing(number, index)} className="hover:text-blue-600">
                                    {value}
                                  </button>
                                  {editingNumber === "" && (
                                    <button
                                      onClick={() => deleteValue(number, index)}
                                      className="text-red-500 hover:text-red-700 p-0.5"
                                      aria-label={`Delete value ${value}`}
                                    >
                                      <Trash2 className="h-2.5 w-2.5" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="font-bold">{getSum(number) > 0 ? getSum(number) : "-"}</TableCell>
                    <TableCell className="text-green-600 font-medium">
                      {getKeptAmount(number) > 0 ? getKeptAmount(number) : "-"}
                    </TableCell>
                    <TableCell className="text-amber-600 font-medium">
                      {getExcessAmount(number) > 0 ? (
                        <>
                          {number}({getExcessAmount(number)})
                        </>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="border-t p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-muted-foreground" />
            <span className="text-lg font-medium">Grand Total:</span>
            <span className="text-2xl font-bold">{grandTotal}</span>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="flex items-center gap-2 w-full sm:w-auto">
                <RefreshCw className="h-4 w-4" />
                Reset All Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will reset all data. All numbers, values, and threshold settings will be deleted. This action
                  cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => resetAllData()} className="bg-red-500 hover:bg-red-600">
                  Reset All Data
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>
    </div>
  )
}
