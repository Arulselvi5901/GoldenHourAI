import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateCellTowerForLocation,
  generateCentralRegistryFacilities,
  generateCentralRegistryAmbulances,
  computeDispatchScoring,
  toggleDoctorAvailability,
  toggleAmbulanceAvailability,
  getAffordabilityQuestionPrompt,
  haversineDistanceKm,
} from './centralRegistryLogic.ts';

describe('GoldenHour Central Registry Pure Logic', () => {
  const callerLat = 10.6455;
  const callerLng = 78.5912;

  it('generateCellTowerForLocation creates realistic serving cell tower data', () => {
    const tower = generateCellTowerForLocation(callerLat, callerLng, 'IND', [
      'near Kali temple',
      'banyan tree',
    ]);
    assert.ok(tower.towerId.startsWith('TOW-IND-'));
    assert.equal(tower.operatorName, 'Simulated Telecom');
    assert.equal(tower.isSimulated, true);
    assert.ok(tower.coverageRadiusKm >= 0.5 && tower.coverageRadiusKm <= 5.0);
    assert.equal(tower.narrowedRadiusMeters, 300);
    assert.ok(tower.narrowingReason.includes('300 m'));
    assert.ok(tower.narrowingReason.includes('Kali temple'));
  });

  it('generateCentralRegistryFacilities produces at least 6 diverse facilities with on-duty doctors', () => {
    const facilities = generateCentralRegistryFacilities(callerLat, callerLng, 'India');
    assert.ok(facilities.length >= 6);

    // Verify facility types and capabilities exist
    const hasGovt = facilities.some((f) => f.type === 'Government Hospital');
    const hasCHC = facilities.some((f) => f.type === 'Community Health Centre');
    const hasPHC = facilities.some((f) => f.type === 'Primary Health Centre');
    const hasPrivate = facilities.some((f) => f.type === 'Private Hospital');
    assert.ok(hasGovt, 'Must include Government Hospital');
    assert.ok(hasCHC, 'Must include CHC');
    assert.ok(hasPHC, 'Must include PHC');
    assert.ok(hasPrivate, 'Must include Private Hospital');

    // Verify doctors exist on each facility with valid status
    for (const fac of facilities) {
      assert.ok(fac.doctorsOnDuty.length > 0, `${fac.name} must have on-duty doctors`);
      for (const doc of fac.doctorsOnDuty) {
        assert.ok(['available', 'busy', 'off'].includes(doc.status));
        assert.ok(doc.name.length > 0);
        assert.equal(doc.hospitalId, fac.id);
      }
      assert.ok(['Free', 'Low', 'Medium', 'High'].includes(fac.costLevel));
      assert.equal(typeof fac.acceptsPublicInsurance, 'boolean');
    }
  });

  it('generateCentralRegistryAmbulances produces at least 5 registered ambulances', () => {
    const ambulances = generateCentralRegistryAmbulances(callerLat, callerLng, 'India');
    assert.ok(ambulances.length >= 5);
    const hasGovt = ambulances.some((a) => a.owner === 'Government');
    const hasFree = ambulances.some((a) => a.cost === 'Free');
    assert.ok(hasGovt);
    assert.ok(hasFree);
  });

  it('computeDispatchScoring: Rule 1 strictly enforces clinical capability & matching specialist', () => {
    const facilities = generateCentralRegistryFacilities(callerLat, callerLng, 'India');
    const ambulances = generateCentralRegistryAmbulances(callerLat, callerLng, 'India');

    const result = computeDispatchScoring({
      emergencyType: 'Acute Myocardial Infarction (Chest Pain)',
      severity: 'Critical',
      facilities,
      ambulances,
      publicInsuranceHolder: true,
      callerLat,
      callerLng,
    });

    assert.ok(result.bestFacility, 'Should select a suitable facility');
    assert.ok(result.bestFacility?.capabilities.cardiac, 'Must have cardiac capability');
    assert.ok(result.bestDoctor, 'Must link an on-duty specialist');
    assert.equal(result.bestDoctor?.status, 'available');
    assert.ok(result.geminiRationale.length > 0);

    // Check that PHC (which has no cardiac) is marked as not passing Rule 1
    const phcScore = result.scoringBreakdown.find(
      (s) => s.facilityType === 'Primary Health Centre'
    );
    assert.ok(phcScore);
    assert.equal(phcScore?.passesRule1, false);
  });

  it('toggleDoctorAvailability changes doctor status and causes re-routing if best doctor becomes busy', () => {
    let facilities = generateCentralRegistryFacilities(callerLat, callerLng, 'India');
    const ambulances = generateCentralRegistryAmbulances(callerLat, callerLng, 'India');

    const initial = computeDispatchScoring({
      emergencyType: 'Acute Myocardial Infarction (Chest Pain)',
      severity: 'Critical',
      facilities,
      ambulances,
      publicInsuranceHolder: false,
      callerLat,
      callerLng,
    });

    const chosenDocId = initial.bestDoctor?.id;
    assert.ok(chosenDocId);

    // Toggle this chosen doctor from available to busy
    const { updatedFacilities, toggledDoctor } = toggleDoctorAvailability(
      facilities,
      chosenDocId!
    );
    assert.equal(toggledDoctor?.status, 'busy');

    // Recompute scoring
    const recomputed = computeDispatchScoring({
      emergencyType: 'Acute Myocardial Infarction (Chest Pain)',
      severity: 'Critical',
      facilities: updatedFacilities,
      ambulances,
      publicInsuranceHolder: false,
      callerLat,
      callerLng,
    });

    // The busy doctor must NOT be selected as the active available doctor
    assert.notEqual(recomputed.bestDoctor?.id, chosenDocId);
    assert.equal(recomputed.bestDoctor?.status, 'available');
  });

  it('toggleAmbulanceAvailability toggles between available and busy', () => {
    const ambulances = generateCentralRegistryAmbulances(callerLat, callerLng, 'India');
    const firstAmbId = ambulances[0].id;
    const { updatedAmbulances, toggledAmbulance } = toggleAmbulanceAvailability(
      ambulances,
      firstAmbId
    );
    assert.equal(toggledAmbulance?.status, 'busy');
    const toggledBack = toggleAmbulanceAvailability(updatedAmbulances, firstAmbId);
    assert.equal(toggledBack.toggledAmbulance?.status, 'available');
  });

  it('getAffordabilityQuestionPrompt returns localized prompts with 3 DTMF options', () => {
    const tamil = getAffordabilityQuestionPrompt('Tamil');
    assert.ok(tamil.promptCallerLang.includes('மருத்துவக் காப்பீட்டு'));
    assert.equal(tamil.options.length, 3);
    assert.equal(tamil.options[0].digit, '1');
    assert.equal(tamil.options[1].digit, '2');
    assert.equal(tamil.options[2].digit, '3');

    const english = getAffordabilityQuestionPrompt('English');
    assert.ok(english.promptCallerLang.includes('government health insurance card'));
  });
});
