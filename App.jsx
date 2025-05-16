"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import "./App.css"

function App() {
  // Create an array of numbers from 0 to 99 with padding
  const numbers = Array.from({ length: 100 }, (_, i) => String(i).padStart(2, "0"))

  // State for the current user's data
  const [numberValues, setNumberValues] = useState({})
  const [globalThreshold, setGlobalThreshold] = useState(0)

  // State for batch input
  const [numbersInput, setNumbersInput] = useState("")
  const [valueInput, setValueInput] = useState("")
  const [thresholdInput, setThresholdInput] = useState("")
  const [inputError, setInputError] = useState("")

  // State for selected number to view details
  const [selectedNumber, setSelectedNumber] = useState("00")

  // State for editing values
  const [editingNumber, setEditingNumber] = useState("")
  const [editingIndex, setEditingIndex] = useState(-1)
  const [editValueInput, setEditValueInput] = useState("")

  // State for reset confirmation dialog
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)

  // Ref for the numbers input field
  const numbersInputRef = useRef(null)

  // Load data from localStorage on initial render
  useEffect(() => {
    try {
      const savedData = localStorage.getItem("numberTrackerData")
      if (savedData) {
        const parsedData = JSON.parse(savedData)
        setNumberValues(parsedData.numberValues || {})
        setGlobalThreshold(parsedData.globalThreshold || 0)
      }
    } catch (error) {
      console.error("Error loading data from localStorage:", error)
    }
  }, [])

  // Save data to localStorage
  const saveDataToLocalStorage = (newNumberValues = numberValues, newGlobalThreshold = globalThreshold) => {
    try {
      const dataToSave = {
        numberValues: newNumberValues,
        globalThreshold: newGlobalThreshold,
      }
      localStorage.setItem("numberTrackerData", JSON.stringify(dataToSave))
    } catch (error) {
      console.error("Error saving data to localStorage:", error)
      alert("Error saving data. Please try again.")
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
  const addValues = () => {
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
    validNumbers.forEach((num) => {
      newNumberValues[num] = [...(newNumberValues[num] || []), value]
    })

    setNumberValues(newNumberValues)

    // Save to localStorage
    saveDataToLocalStorage(newNumberValues, globalThreshold)

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

    setGlobalThreshold(value)

    // Save to localStorage
    saveDataToLocalStorage(numberValues, value)

    setThresholdInput("")
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
  const saveEditedValue = () => {
    const value = Number.parseFloat(editValueInput)
    if (isNaN(value)) return

    const newValues = { ...numberValues }
    newValues[editingNumber] = [...newValues[editingNumber]]
    newValues[editingNumber][editingIndex] = value

    setNumberValues(newValues)

    // Save to localStorage
    saveDataToLocalStorage(newValues, globalThreshold)

    cancelEditing()
  }

  // Cancel editing
  const cancelEditing = () => {
    setEditingNumber("")
    setEditingIndex(-1)
    setEditValueInput("")
  }

  // Delete value
  const deleteValue = (number, index) => {
    const newValues = { ...numberValues }
    newValues[number] = newValues[number].filter((_, i) => i !== index)

    // If there are no more values for this number, remove the number from the object
    if (newValues[number].length === 0) {
      delete newValues[number]
    }

    setNumberValues(newValues)

    // Save to localStorage
    saveDataToLocalStorage(newValues, globalThreshold)

    // If we were editing this value, cancel the edit
    if (number === editingNumber && index === editingIndex) {
      cancelEditing()
    }
  }

  // Reset all data
  const resetAllData = () => {
    // Clear all state
    setNumberValues({})
    setGlobalThreshold(0)
    setThresholdInput("")
    setNumbersInput("")
    setValueInput("")
    setInputError("")
    setSelectedNumber("00")
    cancelEditing()

    // Clear localStorage
    localStorage.removeItem("numberTrackerData")

    // Show success message
    alert("Data reset successfully. All data has been cleared.")

    // Close the dialog
    setIsResetDialogOpen(false)
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

  return (
    <div className="container">
      <div className="card mb-6">
        <div className="card-header">
          <h2 className="card-title">Number Value Tracker</h2>
        </div>
        <div className="card-content">
          <div className="grid-form">
            <div>
              <label htmlFor="numbers" className="form-label">
                Enter numbers (single or multiple, comma separated)
              </label>
              <input
                id="numbers"
                className="form-input"
                placeholder="Example: 00 or 00,04,67,89"
                value={numbersInput}
                onChange={handleNumbersInputChange}
                inputMode="numeric"
                pattern="[0-9,.]+"
                ref={numbersInputRef}
              />
              <p className="helper-text">
                For a single number, enter like "00". For multiple numbers, enter like "00,04,67" (commas will be added
                automatically)
              </p>
            </div>

            <div className="flex-form">
              <div className="form-group">
                <label htmlFor="value" className="form-label">
                  Value to add
                </label>
                <input
                  id="value"
                  type="number"
                  className="form-input"
                  placeholder="Enter value"
                  value={valueInput}
                  onChange={(e) => setValueInput(e.target.value)}
                />
              </div>
              <div className="form-button-container">
                <button onClick={addValues} className="button primary">
                  Add Value(s)
                </button>
              </div>
            </div>

            {inputError && (
              <div className="alert error">
                <span className="alert-icon">⚠️</span>
                <span>{inputError}</span>
              </div>
            )}

            <div className="flex-form threshold-form">
              <div className="form-label-container">
                <label htmlFor="threshold">Global Threshold</label>
              </div>
              <input
                id="threshold"
                type="number"
                className="form-input"
                placeholder="Set threshold for all numbers"
                value={thresholdInput}
                onChange={(e) => setThresholdInput(e.target.value)}
              />
              <button onClick={setThreshold} className="button outline">
                Set Threshold
              </button>
            </div>
          </div>

          <div className="select-container">
            <label htmlFor="selectedNumber" className="form-label">
              Select a number to view details
            </label>
            <select
              id="selectedNumber"
              className="form-select"
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

          {numberValues[selectedNumber] && numberValues[selectedNumber].length > 0 && (
            <div className="values-container">
              <h3 className="section-title">Values for {selectedNumber}:</h3>
              <div className="values-list">
                {numberValues[selectedNumber].map((value, index) => (
                  <div key={index} className="value-tag">
                    {editingNumber === selectedNumber && editingIndex === index ? (
                      <>
                        <input
                          type="number"
                          value={editValueInput}
                          onChange={(e) => setEditValueInput(e.target.value)}
                          onKeyDown={handleEditKeyDown}
                          className="edit-input"
                          autoFocus
                        />
                        <div className="edit-buttons">
                          <button onClick={saveEditedValue} className="icon-button save" aria-label="Save">
                            ✓
                          </button>
                          <button onClick={cancelEditing} className="icon-button cancel" aria-label="Cancel">
                            ✕
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEditing(selectedNumber, index)} className="value-button">
                          {value}
                        </button>
                        {editingNumber === "" && (
                          <button
                            onClick={() => deleteValue(selectedNumber, index)}
                            className="icon-button delete"
                            aria-label={`Delete value ${value}`}
                          >
                            🗑️
                          </button>
                        )}
                      </>
                    )}
                  </div>
                ))}
                <div className="total-tag">Total: {getSum(selectedNumber)}</div>
              </div>
            </div>
          )}

          {globalThreshold > 0 && (
            <div className="threshold-info">
              <h3 className="section-title">Global Threshold: {globalThreshold}</h3>

              <div className="excess-container">
                <div className="excess-info">
                  <div className="info-label">Excess Amounts (All Numbers)</div>
                  <div className="info-value">{consolidatedExcess}</div>
                  <div className="totals-grid">
                    <div>
                      <span className="total-label">Total Excess: </span>
                      <span className="total-value">{totalExcessAmount}</span>
                    </div>
                    <div>
                      <span className="total-label">Total Kept: </span>
                      <span className="total-value">{totalKeptAmount}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="kept-excess-grid">
                <div className="kept-info">
                  <div className="info-label">Selected Number Kept</div>
                  <div className="info-value">{getKeptAmount(selectedNumber)}</div>
                </div>
                <div className="excess-info">
                  <div className="info-label">Selected Number Excess</div>
                  <div className="info-value">
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
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Number Values Table</h2>
        </div>
        <div className="card-content">
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Values</th>
                  <th>Total</th>
                  <th>Kept</th>
                  <th>Excess</th>
                </tr>
              </thead>
              <tbody>
                {numbers.map((number) => (
                  <tr key={number} className={selectedNumber === number ? "selected-row" : ""}>
                    <td className="number-cell">{number}</td>
                    <td>
                      {numberValues[number] ? (
                        <div className="values-list-small">
                          {numberValues[number].map((value, index) => (
                            <div key={index} className="value-tag-small">
                              {editingNumber === number && editingIndex === index ? (
                                <>
                                  <input
                                    type="number"
                                    value={editValueInput}
                                    onChange={(e) => setEditValueInput(e.target.value)}
                                    onKeyDown={handleEditKeyDown}
                                    className="edit-input-small"
                                    autoFocus
                                  />
                                  <div className="edit-buttons-small">
                                    <button
                                      onClick={saveEditedValue}
                                      className="icon-button-small save"
                                      aria-label="Save"
                                    >
                                      ✓
                                    </button>
                                    <button
                                      onClick={cancelEditing}
                                      className="icon-button-small cancel"
                                      aria-label="Cancel"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => startEditing(number, index)} className="value-button-small">
                                    {value}
                                  </button>
                                  {editingNumber === "" && (
                                    <button
                                      onClick={() => deleteValue(number, index)}
                                      className="icon-button-small delete"
                                      aria-label={`Delete value ${value}`}
                                    >
                                      🗑️
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
                    </td>
                    <td className="total-cell">{getSum(number) > 0 ? getSum(number) : "-"}</td>
                    <td className="kept-cell">{getKeptAmount(number) > 0 ? getKeptAmount(number) : "-"}</td>
                    <td className="excess-cell">
                      {getExcessAmount(number) > 0 ? (
                        <>
                          {number}({getExcessAmount(number)})
                        </>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card-footer">
          <div className="grand-total">
            <span className="total-icon">🧮</span>
            <span className="total-label">Grand Total:</span>
            <span className="total-value">{grandTotal}</span>
          </div>

          <button className="button danger" onClick={() => setIsResetDialogOpen(true)}>
            🔄 Reset All Data
          </button>

          {isResetDialogOpen && (
            <div className="modal-overlay">
              <div className="modal">
                <div className="modal-header">
                  <h3>Are you absolutely sure?</h3>
                </div>
                <div className="modal-content">
                  <p>
                    This will reset all data. All numbers, values, and threshold settings will be deleted. This action
                    cannot be undone.
                  </p>
                </div>
                <div className="modal-footer">
                  <button className="button outline" onClick={() => setIsResetDialogOpen(false)}>
                    Cancel
                  </button>
                  <button className="button danger" onClick={resetAllData}>
                    Reset All Data
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
