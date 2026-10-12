export default function EventReservationFields({
  capacity,
  totalParkingSlots,
  seatNumber,
  parkingSlot,
  onSeatNumberChange,
  onParkingSlotChange,
  disabled = false,
}) {
  const seatLimit = Number(capacity) || 0;
  const parkingLimit = Number(totalParkingSlots) || 0;
  if (seatLimit < 1 && parkingLimit < 1) return null;

  const inputStyle = {
    width: '100%',
    minHeight: 40,
    padding: '8px 10px',
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    font: 'inherit',
    boxSizing: 'border-box',
  };
  const labelStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
    color: '#475569',
    fontSize: 12,
    fontWeight: 600,
  };

  return (
    <fieldset
      className="event-reservation-fields"
      disabled={disabled}
      style={{ border: 0, padding: 0, margin: '12px 0', minWidth: 0 }}
    >
      <legend style={{ color: '#475569', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
        Optional seat and parking reservations
      </legend>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        {seatLimit > 0 && (
          <label style={labelStyle}>
            Seat number (1–{seatLimit})
            <input
              aria-label="Event seat number"
              type="number"
              min="1"
              max={seatLimit}
              step="1"
              value={seatNumber ?? ''}
              onChange={(event) => onSeatNumberChange?.(event.target.value)}
              style={inputStyle}
            />
          </label>
        )}
        {parkingLimit > 0 && (
          <label style={labelStyle}>
            Parking slot (1–{parkingLimit})
            <input
              aria-label="Event parking slot"
              type="number"
              min="1"
              max={parkingLimit}
              step="1"
              value={parkingSlot ?? ''}
              onChange={(event) => onParkingSlotChange?.(event.target.value)}
              style={inputStyle}
            />
          </label>
        )}
      </div>
      <p style={{ color: '#64748b', fontSize: 12, margin: '7px 0 0' }}>
        Leave a field blank if no assignment is needed. Registration remains separate from physical attendance check-in.
      </p>
    </fieldset>
  );
}
