
 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract SecureVehicleRegistry {
    address public admin;

    struct Vehicle {
        string registrationNumber;
        bytes32 chassisHash;
        string manufacturer;
        string model;
        uint16 manufacturingYear;
        bytes32 ownerHash;
        uint256 registeredAt;
        bool exists;
        bool active;
    }

    mapping(string => Vehicle) private vehicles;

    uint256 public totalVehicles;

    event VehicleRegistered(
        string registrationNumber,
        bytes32 indexed chassisHash,
        uint256 registeredAt
    );

    event VehicleStatusChanged(
        string registrationNumber,
        bool active
    );

    modifier onlyAdmin() {
        require(msg.sender == admin, "Admin access required");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function registerVehicle(
        string calldata registrationNumber,
        bytes32 chassisHash,
        string calldata manufacturer,
        string calldata model,
        uint16 manufacturingYear,
        bytes32 ownerHash
    ) external onlyAdmin {
        require(bytes(registrationNumber).length > 0, "Registration required");
        require(chassisHash != bytes32(0), "Invalid chassis hash");
        require(ownerHash != bytes32(0), "Invalid owner hash");
        require(
            !vehicles[registrationNumber].exists,
            "Vehicle already registered"
        );

        vehicles[registrationNumber] = Vehicle({
            registrationNumber: registrationNumber,
            chassisHash: chassisHash,
            manufacturer: manufacturer,
            model: model,
            manufacturingYear: manufacturingYear,
            ownerHash: ownerHash,
            registeredAt: block.timestamp,
            exists: true,
            active: true
        });

        totalVehicles++;

        emit VehicleRegistered(
            registrationNumber,
            chassisHash,
            block.timestamp
        );
    }

    function verifyVehicle(
        string calldata registrationNumber,
        bytes32 chassisHash
    ) external view returns (bool) {
        Vehicle storage vehicle = vehicles[registrationNumber];

        return vehicle.exists
            && vehicle.active
            && vehicle.chassisHash == chassisHash;
    }

    function getVehicle(
        string calldata registrationNumber
    ) external view returns (Vehicle memory) {
        require(
            vehicles[registrationNumber].exists,
            "Vehicle not found"
        );

        return vehicles[registrationNumber];
    }

    function changeVehicleStatus(
        string calldata registrationNumber,
        bool active
    ) external onlyAdmin {
        require(
            vehicles[registrationNumber].exists,
            "Vehicle not found"
        );

        vehicles[registrationNumber].active = active;

        emit VehicleStatusChanged(registrationNumber, active);
    }
}
